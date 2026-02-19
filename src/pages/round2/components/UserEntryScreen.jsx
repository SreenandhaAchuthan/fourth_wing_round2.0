import React, { useState, useEffect } from 'react';

const UserEntryScreen = ({ onStart, initialName = '' }) => {
    const [name, setName] = useState(initialName);
    const [rollNo, setRollNo] = useState('');

    // Toggle this to UNLOCK round 2
    const IS_LOCKED = false;

    useEffect(() => {
        if (initialName) {
            setName(initialName);
        }
    }, [initialName]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim() && rollNo.trim()) {
            onStart({ name, rollNo });
        } else {
            alert("Please enter both Name and Roll Number");
        }
    };

    if (IS_LOCKED) {
        return (
            <section id="user-entry-screen" className="screen active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
                <div className="welcome-content" style={{ maxWidth: '500px', width: '100%', padding: '2rem', borderRadius: '15px', background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid #00ff88', textAlign: 'center' }}>
                    <h1 className="main-title" style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: '#ff4444' }}>
                        🚫 ACCESS DENIED 🚫
                    </h1>
                    <p style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '2rem', lineHeight: '1.6' }}>
                        Round 2: "The Protocol" is currently <strong>LOCKED</strong>.
                        <br />
                        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Please wait for the official start signal.</span>
                    </p>
                    <div style={{ fontSize: '3rem' }}>🔒</div>
                </div>
            </section>
        );
    }

    return (
        <section id="user-entry-screen" className="screen active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
            <div className="welcome-content" style={{ maxWidth: '400px', width: '100%', padding: '2rem', borderRadius: '15px', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
                <h1 className="main-title" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>
                    <span className="fire-emoji">🔐</span>
                    Identify Yourself
                </h1>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your full name"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: 'rgba(255, 255, 255, 0.2)', color: '#fff' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>Roll Number / ID</label>
                        <input
                            type="text"
                            value={rollNo}
                            onChange={(e) => setRollNo(e.target.value)}
                            placeholder="Enter your Roll No"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: 'rgba(255, 255, 255, 0.2)', color: '#fff' }}
                        />
                    </div>
                    <button type="submit" className="challenge-btn" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                        Enter Round 2.0
                    </button>
                </form>
            </div>
        </section>
    );
};

export default UserEntryScreen;
