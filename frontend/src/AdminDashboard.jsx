// AdminDashboard.jsx
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom"
import { AdminAuthContext } from "./AdminAuthContext";
import "./AdminDashboard.css";

const AdminDashboard = () => {
    const { accessToken, adminUser, clearAuth } = useContext(AdminAuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (!accessToken) {
            navigate("/admin-login", { replace: true });
        }
    }, [accessToken, navigate]);

    // --- Stock file upload ---
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadMessage, setUploadMessage] = useState("");

    const handleFileChange = (e) => setSelectedFiles(e.target.files);

    const handleUpload = async () => {
        // prevent upload if no token
        if (!accessToken) {
            setUploadMessage("Not authenticated. Please login.");
            return;
        }
        if (!selectedFiles || selectedFiles.length === 0) {
            setUploadMessage("Please select files to upload.");
            return;
        }
        const formData = new FormData();
        Array.from(selectedFiles).forEach((f, i) => formData.append(`file${i}`, f));

        try {
            const res = await fetch("http://127.0.0.1:8000/api/upload-stock-files/", {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
                body: formData,
            });
            const data = await res.json();
            if (res.ok) setUploadMessage(data.message || "Upload successful");
            else setUploadMessage(data.message || "Upload failed");
        } catch (err) {
            setUploadMessage("Network error: " + err.message);
        }
    };

    // --- Company CRUD ---
    const [companies, setCompanies] = useState([]);
    const [form, setForm] = useState({
        id: null,
        symbol: "",
        full_name: "",
        sector: "",
        logo: "",
    });
    const [crudMessage, setCrudMessage] = useState("");

    // UI state
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [toDeleteId, setToDeleteId] = useState(null);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

    useEffect(() => {
        fetchCompanies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchCompanies = async () => {
        setIsLoadingCompanies(true);
        try {
            const res = await fetch("http://127.0.0.1:8000/api/admin/companies/", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await res.json();
            if (res.ok) setCompanies(Array.isArray(data) ? data : []);
            else setCrudMessage(data.message || "Failed to fetch companies");
        } catch (err) {
            setCrudMessage("Network error: " + err.message);
        } finally {
            setIsLoadingCompanies(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        // Basic validation
        if (!form.symbol || !form.full_name) {
            setCrudMessage("Symbol and Full Name are required.");
            return;
        }

        const method = form.id ? "PUT" : "POST";
        const url = form.id
            ? `http://127.0.0.1:8000/api/admin/companies/update/${form.id}/`
            : "http://127.0.0.1:8000/api/admin/companies/create/";

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    symbol: form.symbol,
                    full_name: form.full_name,
                    sector: form.sector,
                    logo: form.logo,
                    metadata: null,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setCrudMessage("Saved successfully");
                setForm({ id: null, symbol: "", full_name: "", sector: "", logo: "" });
                fetchCompanies();
                setEditModalOpen(false);
            } else {
                setCrudMessage(data.message || "Failed to save");
            }
        } catch (err) {
            setCrudMessage("Network error: " + err.message);
        }
    };

    const openEditModal = (company = null) => {
        if (company) {
            setForm({
                id: company.id,
                symbol: company.symbol || "",
                full_name: company.full_name || "",
                sector: company.sector || "",
                logo: company.logo || "",
            });
        } else {
            setForm({ id: null, symbol: "", full_name: "", sector: "", logo: "" });
        }
        setEditModalOpen(true);
    };

    const handleDelete = (id) => {
        setToDeleteId(id);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirmed = async () => {
        if (!toDeleteId) return;
        try {
            const res = await fetch(
                `http://127.0.0.1:8000/api/admin/companies/delete/${toDeleteId}/`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
            const data = await res.json();
            if (res.ok) {
                setCrudMessage("Deleted successfully");
                fetchCompanies();
            } else setCrudMessage(data.message || "Failed to delete");
        } catch (err) {
            setCrudMessage("Network error: " + err.message);
        } finally {
            setDeleteModalOpen(false);
            setToDeleteId(null);
        }
    };

    const filteredCompanies = companies.filter((c) => {
        const s = searchTerm.trim().toLowerCase();
        if (!s) return true;
        return (
            String(c.symbol || "").toLowerCase().includes(s) ||
            String(c.full_name || "").toLowerCase().includes(s) ||
            String(c.sector || "").toLowerCase().includes(s) ||
            String(c.logo || "").toLowerCase().includes(s)
        );
    });

    // my code
    const [contentType, setContentType] = useState("dashboard");

    return (
        <>
            <div className="left-navbar">
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ textAlign: "center", padding: "12px 0px" }}>
                        <span>Welcome, <strong>{adminUser?.username || "Admin"}</strong></span>
                    </div>
                    <div className="content-buttons">
                        <button className={`${contentType === "dashboard" ? "selected-content-btn" : "content-btn"}`} onClick={() => { setContentType("dashboard") }}>Dashboard</button>
                        <button className={`${contentType === "upload file" ? "selected-content-btn" : "content-btn"}`} onClick={() => { setContentType("upload file") }}>Upload File</button>
                        <button className={`${contentType === "manage company" ? "selected-content-btn" : "content-btn"}`} onClick={() => { setContentType("manage company") }}>Manage Company</button>
                    </div>
                </div>
                <button className="ad-logout" onClick={() => clearAuth && clearAuth()}>
                    Logout
                </button>
            </div >
            <div className="dashboard">
                {
                    contentType === "dashboard"
                    &&
                    <p>hello</p>
                }
                {
                    contentType === "upload file"
                    &&
                    <section className="ad-card">
                        <h3 className="ad-section-title">Upload Stock Files</h3>
                        <div className="ad-upload-row">
                            <input
                                className="ad-file-input"
                                type="file"
                                multiple
                                onChange={handleFileChange}
                            />
                            <button className="ad-button ad-button--primary" onClick={handleUpload}>
                                Upload
                            </button>
                        </div>
                        {uploadMessage && <p className="ad-message">{uploadMessage}</p>}
                    </section>
                }
                {
                    contentType === "manage company"
                    &&
                    <section className="ad-card">
                        <div className="ad-section-head">
                            <h3 className="ad-section-title">Manage Companies</h3>
                            <div className="ad-actions">
                                <input
                                    className="ad-search"
                                    placeholder="Search by symbol, name or sector..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button className="ad-button" onClick={() => openEditModal(null)}>
                                    + Create
                                </button>

                            </div>
                        </div>

                        {crudMessage && <p className="ad-message">{crudMessage}</p>}

                        <div className="ad-table-wrap">
                            <table className="ad-table" cellSpacing="0">
                                <thead>
                                    <tr>
                                        <th>Logo</th>
                                        <th>Symbol</th>
                                        <th>Full Name</th>
                                        <th>Sector</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoadingCompanies ? (
                                        <tr><td colSpan="5" className="ad-empty">Loading companies...</td></tr>
                                    ) : filteredCompanies.length === 0 ? (
                                        <tr><td colSpan="5" className="ad-empty">No companies found.</td></tr>
                                    ) : (
                                        filteredCompanies.map((c) => (
                                            <tr key={c.id}>
                                                <td className="ad-logo-cell">
                                                    {c.logo ? (
                                                        // show image with fallback
                                                        // eslint-disable-next-line jsx-a11y/img-redundant-alt
                                                        <img
                                                            className="ad-logo"
                                                            src={`http://127.0.0.1:8000/${c.logo}`}
                                                            alt={`logo-${c.symbol}`}
                                                            onError={(e) => (e.currentTarget.style.display = "none")}
                                                        />
                                                    ) : (
                                                        <div className="ad-logo-placeholder">{(c.symbol || "").charAt(0) || "?"}</div>
                                                    )}
                                                </td>
                                                <td>{c.symbol}</td>
                                                <td>{c.full_name}</td>
                                                <td>{c.sector}</td>
                                                <td style={{ display: "flex", gap: "6px" }}>
                                                    <button className="ad-button ad-button--small" onClick={() => openEditModal(c)}>
                                                        Edit
                                                    </button>
                                                    <button className="ad-button ad-button--danger ad-button--small" onClick={() => handleDelete(c.id)}>
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                }
            </div>

            {/* Edit Modal */}
            {
                isEditModalOpen && (
                    <div className="edit-modal-bg">
                        <div className="edit-modal">
                            <div className="ad-modal-header">
                                <h4>{form.id ? "Edit Company" : "Create Company"}</h4>
                                <button className="ad-modal-close" onClick={() => setEditModalOpen(false)}>×</button>
                            </div>
                            <div className="ad-modal-body">
                                <label className="ad-field">
                                    <span className="ad-field-label">Symbol</span>
                                    <input name="symbol" value={form.symbol} onChange={handleInputChange} />
                                </label>
                                <label className="ad-field">
                                    <span className="ad-field-label">Full Name</span>
                                    <input name="full_name" value={form.full_name} onChange={handleInputChange} />
                                </label>
                                <label className="ad-field">
                                    <span className="ad-field-label">Sector</span>
                                    <input name="sector" value={form.sector} onChange={handleInputChange} />
                                </label>
                                <label className="ad-field">
                                    <span className="ad-field-label">Logo URL</span>
                                    <input name="logo" value={form.logo} onChange={handleInputChange} />
                                </label>
                            </div>
                            <div className="ad-modal-footer">
                                <button className="ad-button" onClick={() => setEditModalOpen(false)}>Cancel</button>
                                <button className="ad-button ad-button--primary" onClick={handleSubmit}>
                                    {form.id ? "Update" : "Create"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                isDeleteModalOpen && (
                    <div className="edit-modal-bg">
                        <div className="edit-modal">
                            <div className="ad-modal-header">
                                <h4>Confirm Delete</h4>
                                <button className="ad-modal-close" onClick={() => setDeleteModalOpen(false)}>×</button>
                            </div>
                            <div className="ad-modal-body">
                                <p>Are you sure you want to delete this company? This action cannot be undone.</p>
                            </div>
                            <div className="ad-modal-footer">
                                <button className="ad-button" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
                                <button className="ad-button ad-button--danger" onClick={handleDeleteConfirmed}>Delete</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default AdminDashboard;
