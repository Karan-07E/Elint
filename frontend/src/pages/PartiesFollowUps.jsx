import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import {
    LuCalendar,
    LuFlag,
    LuMessageSquare,
    LuSave,
    LuUser,
    LuClock,
    LuHistory,
    LuCircleAlert
} from "react-icons/lu";

const PartiesFollowUps = () => {
    const [parties, setParties] = useState([]);
    const [selectedPartyId, setSelectedPartyId] = useState('');
    const [selectedParty, setSelectedParty] = useState(null);
    const [followUps, setFollowUps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        meetingDateTime: '',
        remarks: '',
        flag: 'neutral'
    });

    const fetchParties = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/parties', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch parties');
            const data = await response.json();
            setParties(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchFollowUps = async (partyId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/parties/follow-ups?partyId=${partyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch follow-ups');
            const data = await response.json();
            setFollowUps(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchParties();
    }, []);

    useEffect(() => {
        if (selectedPartyId) {
            const party = parties.find(p => p._id === selectedPartyId);
            setSelectedParty(party);
            fetchFollowUps(selectedPartyId);
        } else {
            setSelectedParty(null);
            setFollowUps([]);
        }
    }, [selectedPartyId, parties]);

    const handlePartyChange = (e) => {
        setSelectedPartyId(e.target.value);
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPartyId) return;

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                partyId: selectedPartyId,
                partyName: selectedParty.name
            };

            const response = await fetch('/api/parties/follow-ups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to create follow-up');

            // Refresh list and clear form
            await fetchFollowUps(selectedPartyId);
            setFormData({
                meetingDateTime: '',
                remarks: '',
                flag: 'neutral'
            });
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getFlagColor = (flag) => {
        switch (flag) {
            case 'positive': return 'bg-green-100 text-green-700 border-green-200';
            case 'negative': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="min-h-screen bg-slate-100">
            <Sidebar />
            <div className="ml-64 p-6">

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <LuMessageSquare className="text-blue-600" />
                        Parties Follow Ups
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Track customer meetings and sentiment analysis</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-2 mb-6">
                        <LuCircleAlert />
                        {error}
                    </div>
                )}

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column: Form */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">
                                New Follow Up
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Party Selection */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">Select Party</label>
                                    <div className="relative">
                                        <LuUser className="absolute left-3 top-3 text-slate-400" />
                                        <select
                                            value={selectedPartyId}
                                            onChange={handlePartyChange}
                                            className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            required
                                        >
                                            <option value="">-- Choose a Party --</option>
                                            {parties.map(p => (
                                                <option key={p._id} value={p._id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Read-only Name */}
                                {selectedParty && (
                                    <div className="space-y-1.5 opacity-75">
                                        <label className="text-xs font-semibold text-slate-600 ml-1">Party Name</label>
                                        <input
                                            type="text"
                                            value={selectedParty.name}
                                            readOnly
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-500 text-sm rounded-lg px-3 py-2 cursor-not-allowed"
                                        />
                                    </div>
                                )}

                                {/* Date Time */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">Meeting Date & Time</label>
                                    <div className="relative">
                                        <input
                                            type="datetime-local"
                                            name="meetingDateTime"
                                            value={formData.meetingDateTime}
                                            onChange={handleInputChange}
                                            className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg pl-3 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none block"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Remarks */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">Remarks</label>
                                    <textarea
                                        name="remarks"
                                        value={formData.remarks}
                                        onChange={handleInputChange}
                                        rows={4}
                                        className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                                        placeholder="Enter meeting notes..."
                                        required
                                    />
                                </div>

                                {/* Flag */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600 ml-1">Sentiment Flag</label>
                                    <div className="relative">
                                        <LuFlag className="absolute left-3 top-3 text-slate-400" />
                                        <select
                                            name="flag"
                                            value={formData.flag}
                                            onChange={handleInputChange}
                                            className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                            required
                                        >
                                            <option value="neutral">Neutral</option>
                                            <option value="positive">Positive</option>
                                            <option value="negative">Negative</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting || !selectedPartyId}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-sm hover:shadow"
                                >
                                    {submitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <LuSave size={18} />
                                            Save Follow Up
                                        </>
                                    )}
                                </button>

                            </form>
                        </div>
                    </div>

                    {/* Right Column: History */}
                    <div className="lg:col-span-2">
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm min-h-[600px] flex flex-col">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <LuHistory className="text-slate-400" />
                                Follow Up History
                                {selectedParty && <span className="text-sm font-normal text-slate-500 ml-auto">for <span className="font-semibold text-slate-800">{selectedParty.name}</span></span>}
                            </h2>

                            {!selectedPartyId ? (
                                <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <LuUser size={32} className="opacity-50" />
                                    </div>
                                    <p>Select a party to view history</p>
                                </div>
                            ) : followUps.length === 0 ? (
                                <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <LuMessageSquare size={32} className="opacity-50" />
                                    </div>
                                    <p>No follow-ups recorded yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                    {followUps.map(item => (
                                        <div key={item._id} className="bg-slate-50 rounded-lg p-4 border border-slate-100 hover:border-blue-200 transition-colors group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                                                    <LuClock size={14} className="text-blue-500" />
                                                    <span>{new Date(item.meetingDateTime).toLocaleString()}</span>
                                                </div>
                                                <span className={`text-xs px-2.5 py-1 rounded-full border border-opacity-50 font-semibold uppercase tracking-wide ${getFlagColor(item.flag)}`}>
                                                    {item.flag}
                                                </span>
                                            </div>

                                            <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                                                {item.remarks}
                                            </p>

                                            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    By: <span className="font-medium text-slate-600">{item.createdBy?.name || item.createdBy?.email || 'Unknown'}</span> ({item.createdByRole})
                                                </span>
                                                <span>Recorded: {new Date(item.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartiesFollowUps;
