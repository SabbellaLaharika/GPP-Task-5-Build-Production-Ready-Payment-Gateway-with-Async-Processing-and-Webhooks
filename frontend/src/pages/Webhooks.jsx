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
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const apiKey = 'key_test_abc123';

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
            fetchLogs();
        } catch (err) {
            alert("Failed to retry webhook");
        }
    };

    const sendTestWebhook = () => {
        alert("To test webhooks, verify URL below and then Create an Order & Pay in the Create Order tab.");
    };

    return (
        <div className="page-container">
            <div className="dashboard-header">
                <div className="header-inner">
                    <div className="header-left">
                        <a href="/dashboard" className="back-link">← Back</a>
                        <h1>Webhook Configuration</h1>
                    </div>
                </div>
            </div>

            <div className="main-content">
                {message && <div className="alert alert-success">{message}</div>}

                <div className="card" data-test-id="webhook-config">
                    <h2>Webhook Configuration</h2>

                    <form data-test-id="webhook-config-form" onSubmit={saveWebhookUrl}>
                        <div className="form-group">
                            <label>Webhook URL</label>
                            <input
                                data-test-id="webhook-url-input"
                                type="url"
                                value={webhookUrl || ''}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                placeholder="https://yoursite.com/webhook"
                            />
                        </div>

                        <div className="form-group">
                            <label>Webhook Secret</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span data-test-id="webhook-secret" className="code-font">{webhookSecret || 'whsec_...'}</span>
                                <button type="button" data-test-id="regenerate-secret-button" onClick={regenerateSecret} className="btn btn-sm">
                                    Regenerate
                                </button>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                            <button data-test-id="save-webhook-button" type="submit" className="btn btn-primary">
                                Save Configuration
                            </button>

                            <button data-test-id="test-webhook-button" type="button" onClick={sendTestWebhook} className="btn btn-secondary">
                                Send Test Webhook
                            </button>
                        </div>
                    </form>

                    <h3 style={{ marginTop: '40px' }}>Webhook Logs</h3>
                    <table className="data-table" data-test-id="webhook-logs-table">
                        <thead>
                            <tr>
                                <th>Event</th>
                                <th>Status</th>
                                <th>Attempts</th>
                                <th>Last Attempt</th>
                                <th>Response Code</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id} data-test-id="webhook-log-item" data-webhook-id={log.id}>
                                    <td data-test-id="webhook-event">{log.event}</td>
                                    <td data-test-id="webhook-status">{log.status}</td>
                                    <td data-test-id="webhook-attempts">{log.attempts}</td>
                                    <td data-test-id="webhook-last-attempt">
                                        {new Date(log.lastAttemptAt).toLocaleString()}
                                    </td>
                                    <td data-test-id="webhook-response-code">{log.responseCode}</td>
                                    <td>
                                        <button
                                            data-test-id="retry-webhook-button"
                                            data-webhook-id={log.id}
                                            onClick={() => retryWebhook(log.id)}
                                            className="btn btn-sm"
                                        >
                                            Retry
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Webhooks;
