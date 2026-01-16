import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';

// Configure API base URL
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : '';

const Webhooks = () => {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const apiKey = 'key_test_abc123'; // Hardcoded for demo/test merchant

    useEffect(() => {
        fetchConfig();
        fetchLogs();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/v1/merchant`, {
                headers: { 'X-Api-Key': apiKey }
            });
            setWebhookUrl(response.data.webhook_url);
            setWebhookSecret(response.data.webhook_secret);
        } catch (err) {
            console.error("Failed to fetch merchant config", err);
        }
    };

    const fetchLogs = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/v1/webhooks?page=0&size=20`, {
                headers: { 'X-Api-Key': apiKey }
            });
            if (response.data && response.data.content) {
                setLogs(response.data.content);
            }
        } catch (err) {
            console.error("Failed to fetch webhook logs", err);
        }
    };

    const saveWebhookUrl = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const response = await axios.post(`${API_BASE_URL}/api/v1/merchant/webhook-config`,
                { webhook_url: webhookUrl },
                { headers: { 'X-Api-Key': apiKey } }
            );
            setMessage(response.data.message);
        } catch (err) {
            setError('Failed to update Webhook URL');
        }
    };

    const regenerateSecret = async () => {
        if (!window.confirm("Are you sure? This will invalidate the old secret.")) return;
        try {
            const response = await axios.post(`${API_BASE_URL}/api/v1/merchant/regenerate-secret`, {}, {
                headers: { 'X-Api-Key': apiKey }
            });
            setWebhookSecret(response.data.webhook_secret);
            setMessage(response.data.message);
        } catch (err) {
            setError('Failed to regenerate secret');
        }
    };

    const retryWebhook = async (id) => {
        try {
            await axios.post(`${API_BASE_URL}/api/v1/webhooks/${id}/retry`, {}, {
                headers: { 'X-Api-Key': apiKey }
            });
            alert("Retry scheduled!");
            fetchLogs(); // Refresh logs
        } catch (err) {
            alert("Failed to retry webhook");
        }
    };

    const sendTestWebhook = async () => {
        alert("To test webhooks, verify URL below and then Create an Order & Pay in the Create Order tab.");
    };

    const handleLogout = () => {
        localStorage.removeItem('merchantEmail');
        window.location.href = '/login';
    };

    return (
        <div className="page-container">
            {/* Standard Header */}
            <div className="dashboard-header">
                <div className="header-inner">
                    <div className="header-left">
                        <a href="/dashboard" className="back-link">
                            ← Back to Dashboard
                        </a>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Webhook Configuration</h1>
                    </div>
                    <button onClick={handleLogout} className="btn btn-danger btn-sm">
                        Logout
                    </button>
                </div>
            </div>

            <div className="main-content">
                {message && <div className="alert alert-success">{message}</div>}
                {error && <div className="alert alert-error">{error}</div>}

                <div className="card">
                    <h2>Configuration</h2>
                    <form onSubmit={saveWebhookUrl}>
                        <div className="form-group">
                            <label>Webhook URL</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="url"
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    placeholder="https://yoursite.com/webhook"
                                    required
                                />
                                <button type="submit" className="btn btn-primary">
                                    Save
                                </button>
                            </div>
                            <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                                We will send POST requests to this URL for all events.
                            </small>
                        </div>

                        <div className="form-group">
                            <label>Webhook Secret</label>
                            <div className="secret-display">
                                <span className="code-font">{webhookSecret || '• • • • • • • •'}</span>
                                <button
                                    type="button"
                                    onClick={regenerateSecret}
                                    className="btn btn-secondary btn-sm"
                                >
                                    ↻ Regenerate
                                </button>
                            </div>
                            <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                                Use this secret to verify the <code>X-Webhook-Signature</code> header.
                            </small>
                        </div>

                        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <button type="button" onClick={sendTestWebhook} className="btn btn-secondary">
                                Test Webhooks
                            </button>
                        </div>
                    </form>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ border: 'none', margin: 0 }}>Recent Logs</h2>
                        <button onClick={fetchLogs} className="btn btn-secondary btn-sm">Refresh</button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Event</th>
                                    <th>Status</th>
                                    <th>Attempts</th>
                                    <th>Last Attempt</th>
                                    <th>Response</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>No webhook logs found yet.</td></tr>
                                ) : (
                                    logs.map(log => (
                                        <tr key={log.id}>
                                            <td><span style={{ fontWeight: '600' }}>{log.event}</span></td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: log.status === 'success' ? '#d4edda' : log.status === 'pending' ? '#fff3cd' : '#f8d7da',
                                                    color: log.status === 'success' ? '#155724' : log.status === 'pending' ? '#856404' : '#721c24',
                                                    fontWeight: 'bold',
                                                    fontSize: '12px',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td>{log.attempts}/5</td>
                                            <td>{new Date(log.lastAttemptAt).toLocaleString()}</td>
                                            <td><code style={{ fontSize: '12px' }}>{log.responseCode || '-'}</code></td>
                                            <td>
                                                {log.status !== 'success' && (
                                                    <button
                                                        onClick={() => retryWebhook(log.id)}
                                                        className="btn btn-secondary btn-sm"
                                                        style={{ padding: '4px 8px', fontSize: '12px' }}
                                                    >
                                                        Retry
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Webhooks;
