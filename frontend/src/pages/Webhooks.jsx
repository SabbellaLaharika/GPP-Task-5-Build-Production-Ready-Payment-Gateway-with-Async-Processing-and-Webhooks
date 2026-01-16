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
        // Trigger a fake payment or just manually hit an endpoint if available
        // For now, we can create a dummy payment and see if it triggers
        // Or we rely on user creating a payment via Create Order tab.
        alert("To test webhooks, verify URL below and then Create an Order & Pay in the Create Order tab.");
    };

    return (
        <div className="container" data-test-id="webhook-config">
            <h2>Webhook Configuration</h2>

            {message && <div className="alert success">{message}</div>}
            {error && <div className="alert error">{error}</div>}

            <form onSubmit={saveWebhookUrl} data-test-id="webhook-config-form" className="config-card">
                <div className="form-group">
                    <label>Webhook URL</label>
                    <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://yoursite.com/webhook"
                        data-test-id="webhook-url-input"
                        required
                    />
                </div>

                <div className="form-group secret-group">
                    <label>Webhook Secret</label>
                    <div className="secret-display">
                        <span data-test-id="webhook-secret" className="code-font">{webhookSecret || 'Loading...'}</span>
                        <button
                            type="button"
                            onClick={regenerateSecret}
                            data-test-id="regenerate-secret-button"
                            className="btn-secondary sm"
                        >
                            Regenerate
                        </button>
                    </div>
                </div>

                <div className="button-group">
                    <button type="submit" data-test-id="save-webhook-button" className="btn-primary">
                        Save Configuration
                    </button>
                    <button type="button" onClick={sendTestWebhook} data-test-id="test-webhook-button" className="btn-secondary">
                        Test Webhooks
                    </button>
                </div>
            </form>

            <h3 style={{ marginTop: '40px' }}>Webhook Logs</h3>
            <div className="table-responsive">
                <table data-test-id="webhook-logs-table" className="data-table">
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
                            <tr><td colSpan="6" style={{ textAlign: 'center' }}>No logs found</td></tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} data-test-id="webhook-log-item" data-webhook-id={log.id}>
                                    <td data-test-id="webhook-event">{log.event}</td>
                                    <td>
                                        <span className={`status-badge status-${log.status}`} data-test-id="webhook-status">
                                            {log.status}
                                        </span>
                                    </td>
                                    <td data-test-id="webhook-attempts">{log.attempts}</td>
                                    <td data-test-id="webhook-last-attempt">
                                        {new Date(log.lastAttemptAt).toLocaleString()}
                                    </td>
                                    <td data-test-id="webhook-response-code">
                                        {log.responseCode || '-'}
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => retryWebhook(log.id)}
                                            data-test-id="retry-webhook-button"
                                            data-webhook-id={log.id}
                                            className="btn-secondary xs"
                                        >
                                            Retry
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Webhooks;
