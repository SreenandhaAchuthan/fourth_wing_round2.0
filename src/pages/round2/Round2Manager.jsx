import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, setDoc, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import './round2.css';
import './styles/scroll-challenges.css';
import { challengeData } from './challengeData';
import { useAuth } from '../../context/AuthContext';

// Components
import UserEntryScreen from './components/UserEntryScreen';
import ResultScreen from './components/ResultScreen';

// Challenges
import Challenge1 from './challenges/Challenge1';
import Challenge2 from './challenges/Challenge2';
import Challenge3 from './challenges/Challenge3';
import Challenge4 from './challenges/Challenge4';
import Challenge5 from './challenges/Challenge5';
import Challenge6 from './challenges/Challenge6';
import Challenge7 from './challenges/Challenge7';
import Challenge9 from './challenges/Challenge9';
import Challenge10 from './challenges/Challenge10';

const ROUND2_DURATION = 3600; // 60 Minutes in seconds

const Round2Manager = () => {
    const { user } = useAuth();
    const [gameState, setGameState] = useState('entry'); // entry, playing, result
    const [userInfo, setUserInfo] = useState({ name: '', rollNo: '' });
    const [currentChallenge, setCurrentChallenge] = useState(1);
    const [score, setScore] = useState(0);
    const [challengesCompleted, setChallengesCompleted] = useState(0);
    const [gameDocId, setGameDocId] = useState(null); // ID of the Firestore document for this session
    const [loadingSession, setLoadingSession] = useState(true);

    // Timer State
    const [timeRemaining, setTimeRemaining] = useState(ROUND2_DURATION);
    const timerRef = useRef(null);

    // Fullscreen & Warning State
    const [isFullscreen, setIsFullscreen] = useState(true);
    const [showWarning, setShowWarning] = useState(false);
    const [warningTime, setWarningTime] = useState(10);
    const warningTimerRef = useRef(null);

    // New State for features
    const [showHint, setShowHint] = useState(false);
    const [showCompletion, setShowCompletion] = useState(false);
    const [completionMessage, setCompletionMessage] = useState('');
    const [attemptCount, setAttemptCount] = useState(0);

    const currentChallengeRef = useRef(null);
    const totalChallenges = 9;

    // Check for existing session on mount or when user changes
    useEffect(() => {
        const checkSession = async () => {
            if (!user) {
                setLoadingSession(false);
                return;
            }

            try {
                const q = query(
                    collection(db, 'round2'),
                    where('uid', '==', user.uid),
                    limit(1)
                );

                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const sessionDoc = querySnapshot.docs[0];
                    const data = sessionDoc.data();

                    if (data.status === 'completed') {
                        setUserInfo({ name: data.name, rollNo: data.rollNo });
                        setScore(data.score);
                        setGameDocId(sessionDoc.id);
                        setGameState('result');
                    } else {
                        // Resume session
                        setUserInfo({ name: data.name, rollNo: data.rollNo });
                        setScore(data.score || 0);
                        setChallengesCompleted(data.challengesCompleted || 0);

                        // Calculate remaining time
                        if (data.startedAt) {
                            const now = new Date();
                            const startTime = data.startedAt.toDate(); // Firebase Timestamp to Date
                            const elapsed = Math.floor((now - startTime) / 1000);
                            const remaining = Math.max(0, ROUND2_DURATION - elapsed);
                            setTimeRemaining(remaining);

                            // If time expired while away
                            if (remaining === 0) {
                                finishGame(data.score || 0, data.challengesCompleted || 0);
                                return; // Stop processing
                            }
                        }

                        let nextChallenge = (data.challengesCompleted || 0) + 1;
                        if (nextChallenge > totalChallenges) nextChallenge = totalChallenges;
                        setCurrentChallenge(nextChallenge);
                        setGameDocId(sessionDoc.id);
                        setGameState('playing');
                        // Note: We don't force fullscreen on resume immediately to avoid annoying popup, 
                        // but the listener will catch it once they interact or we could force a modal.
                        // For now, let's just rely on the listener which will trigger warning if not in fullscreen.
                    }
                }
            } catch (error) {
                console.error("Error checking session:", error);
            } finally {
                setLoadingSession(false);
            }
        };

        checkSession();
    }, [user]);

    // Timer Interval
    useEffect(() => {
        if (gameState === 'playing' && timeRemaining > 0) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        finishGame(score, challengesCompleted);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState, timeRemaining, score, challengesCompleted]);

    // Fullscreen Listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && gameState === 'playing') {
                setIsFullscreen(false);
                setShowWarning(true);
                setWarningTime(10);
            } else {
                setIsFullscreen(true);
                setShowWarning(false);
                if (warningTimerRef.current) clearInterval(warningTimerRef.current);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [gameState]);

    // Warning Timer
    useEffect(() => {
        if (showWarning && gameState === 'playing') {
            warningTimerRef.current = setInterval(() => {
                setWarningTime(prev => {
                    if (prev <= 1) {
                        clearInterval(warningTimerRef.current);
                        alert("You failed to return to fullscreen. Mission Aborted.");
                        finishGame(score, challengesCompleted);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (warningTimerRef.current) clearInterval(warningTimerRef.current);
        }
        return () => {
            if (warningTimerRef.current) clearInterval(warningTimerRef.current);
        };
    }, [showWarning, gameState, score, challengesCompleted]);


    const enterFullscreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.warn(`Error attempting to enable fullscreen: ${err.message}`);
            });
        }
    };

    // Initialize game session in Firestore
    const handleStart = async (info) => {
        setUserInfo(info);
        enterFullscreen();
        setGameState('playing');
        setTimeRemaining(ROUND2_DURATION);

        try {
            const sessionData = {
                name: info.name,
                rollNo: info.rollNo,
                score: 0,
                challengesCompleted: 0,
                startedAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                uid: user ? user.uid : null, // Link to Auth UID if logged in
                email: user ? user.email : null
            };

            const docRef = await addDoc(collection(db, 'round2'), sessionData);
            setGameDocId(docRef.id);
            console.log("Game started, ID:", docRef.id);
        } catch (error) {
            console.error("Error starting game session:", error);
            alert("Error initializing game session in database: " + error.message + ". Progress might not be saved!");
        }
    };

    const updateScoreInFirestore = async (newScore, completedCount) => {
        if (!gameDocId) return;
        try {
            const docRef = doc(db, 'round2', gameDocId);
            await updateDoc(docRef, {
                score: newScore,
                challengesCompleted: completedCount,
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating score:", error);
        }
    };

    const handleChallengeComplete = () => {
        const newScore = score + 10;
        const newCompletedCount = challengesCompleted + 1;

        setScore(newScore);
        setChallengesCompleted(newCompletedCount);
        updateScoreInFirestore(newScore, newCompletedCount);

        setAttemptCount(0); // Reset attempts for new challenge
        if (currentChallenge < totalChallenges) {
            setCurrentChallenge(prev => prev + 1);
        } else {
            finishGame(newScore, newCompletedCount);
        }
    };

    const handleWrongAnswer = () => {
        const newAttempts = attemptCount + 1;
        setAttemptCount(newAttempts);

        const newScore = Math.max(0, score - 2);
        setScore(newScore);
        // Note: We update score even on wrong answer, but completed count remains same
        updateScoreInFirestore(newScore, challengesCompleted);

        // Auto-skip after 3 wrong attempts (except for Challenge 8 - The Warp Gates, and Challenge 3 - The Memory Core)
        if (newAttempts >= 3 && currentChallenge !== 8 && currentChallenge !== 3) {
            setAttemptCount(0);

            const newCompletedCount = challengesCompleted + 1;
            setChallengesCompleted(newCompletedCount);
            updateScoreInFirestore(newScore, newCompletedCount);

            if (currentChallenge < totalChallenges) {
                setCurrentChallenge(prev => prev + 1);
            } else {
                finishGame(newScore, newCompletedCount);
            }
        }
    };

    const handleSkip = () => {
        if (window.confirm("Are you sure you want to skip this challenge? You will receive 0 points.")) {
            // Always award 0 marks when skipping
            const pointsToAdd = 0;

            const newScore = score + pointsToAdd;
            const newCompletedCount = challengesCompleted + 1;

            setScore(newScore);
            setChallengesCompleted(newCompletedCount);
            updateScoreInFirestore(newScore, newCompletedCount);

            setAttemptCount(0); // Reset attempts for new challenge
            if (currentChallenge < totalChallenges) {
                setCurrentChallenge(prev => prev + 1);
            } else {
                finishGame(newScore, newCompletedCount);
            }
        }
    };

    const handleHint = () => {
        if (showHint) {
            setShowHint(false); // Toggle off if already showing? Or maybe just re-show
            return;
        }

        if (window.confirm("Using a hint will cost 2 marks. Proceed?")) {
            const newScore = Math.max(0, score - 2);
            setScore(newScore);
            updateScoreInFirestore(newScore, challengesCompleted);

            // Show hint logic
            // We need to pass the hint text to the modal
            setShowHint(true);
        }
    };

    const finishGame = async (finalScore, finalChallengesCompleted) => {
        // Clear timers
        if (timerRef.current) clearInterval(timerRef.current);
        if (warningTimerRef.current) clearInterval(warningTimerRef.current);
        if (document.fullscreenElement) document.exitFullscreen().catch(e => console.log(e));

        if (gameDocId) {
            const docRef = doc(db, 'round2', gameDocId);
            await updateDoc(docRef, {
                completedAt: serverTimestamp(),
                status: 'completed'
            });

            // Add to Leaderboard
            try {
                // Use gameDocId as the document ID for the leaderboard entry as well to prevent duplicates per session
                const leaderboardRef = doc(db, 'round2', 'leaderboard', 'entries', gameDocId);
                await setDoc(leaderboardRef, {
                    name: userInfo.name,
                    rollNo: userInfo.rollNo,
                    score: finalScore,
                    challengesCompleted: finalChallengesCompleted,
                    status: 'completed',
                    completedAt: serverTimestamp(),
                    uid: user ? user.uid : null // Include UID for query purposes
                });
                console.log("Added to round2 leaderboard");
            } catch (err) {
                console.error("Error adding to leaderboard:", err);
            }
        }
        setGameState('result');
    };

    const handleBackToMenu = () => {
        if (window.confirm("Are you sure you want to quit? Progress will be lost.")) {
            // Exit fullscreen if quitting
            if (document.fullscreenElement) document.exitFullscreen().catch(e => console.log(e));

            setGameState('entry');
            setCurrentChallenge(1);
            setScore(0);
            setChallengesCompleted(0);
            setGameDocId(null);
            setShowHint(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerClass = () => {
        if (timeRemaining <= 300) return 'timer-critical'; // 5 mins
        if (timeRemaining <= 900) return 'timer-warning';  // 15 mins
        return 'timer-normal';
    };

    // Render current challenge
    const renderChallenge = () => {
        const commonProps = {
            onComplete: handleChallengeComplete,
            onBack: handleBackToMenu,
            onWrongAnswer: handleWrongAnswer,
            ref: currentChallengeRef
        };

        switch (currentChallenge) {
            case 1: return <Challenge1 {...commonProps} />;
            case 2: return <Challenge2 {...commonProps} />;
            case 3: return <Challenge3 {...commonProps} />;
            case 4: return <Challenge4 {...commonProps} />;
            case 5: return <Challenge5 {...commonProps} />;
            case 6: return <Challenge6 {...commonProps} />;
            case 7: return <Challenge7 {...commonProps} />;
            case 8: return <Challenge9 {...commonProps} />;
            case 9: return <Challenge10 {...commonProps} />;
            default: return <div>Unknown Challenge</div>;
        }
    };

    const currentData = challengeData[currentChallenge] || { title: "Unknown", story: "No story available.", hint: "No hint available." };

    if (loadingSession) {
        return <div className="loading-screen" style={{ color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading Mission Data...</div>;
    }

    return (
        <div className="round2-app">
            {gameState === 'entry' && <UserEntryScreen onStart={handleStart} initialName={user?.displayName} />}
            {gameState === 'playing' && (
                <div className="game-layout">
                    {/* Warning Overlay */}
                    {showWarning && (
                        <div className="fullscreen-warning-overlay">
                            <div className="warning-box">
                                <h2>⚠️ WARNING ⚠️</h2>
                                <p>You have left fullscreen mode!</p>
                                <p className="warning-count">Returning in {warningTime}s</p>
                                <p>If the timer hits 0, the mission will be aborted.</p>
                                <button className="start-btn" onClick={enterFullscreen}>
                                    Return to Fullscreen
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sidebar Menu */}
                    <div className="challenge-sidebar">
                        <div className="sidebar-header">
                            <h3>Mission Log</h3>
                            <div className="sidebar-score">Score: {score}</div>
                            <div className={`sidebar-timer ${getTimerClass()}`} style={{ marginTop: '10px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                ⏱️ {formatTime(timeRemaining)}
                            </div>
                        </div>
                        <ul className="challenge-list">
                            {Array.from({ length: totalChallenges }, (_, i) => i + 1).map(num => (
                                <li
                                    key={num}
                                    className={`challenge-item ${currentChallenge === num ? 'active' : ''} ${num < currentChallenge ? 'completed' : ''}`}
                                    onClick={() => {
                                        // Optional: Prevent jumping ahead if strict mode?
                                        // For now allowing jump to completed or current
                                        if (num <= challengesCompleted + 1) {
                                            setCurrentChallenge(num);
                                        }
                                    }}
                                >
                                    <span className="challenge-number">{num}</span>
                                    <span className="challenge-name">
                                        {challengeData[num]?.title || `Challenge ${num}`}
                                    </span>
                                    {num < currentChallenge && <span className="status-icon">✓</span>}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="game-main-content">
                        <div className="game-hud-new">
                            <div className="rules-container">
                                <div className="rules-box">
                                    <h4 className="rules-title">📜 Rules & Penalties</h4>
                                    <div className="rules-content">
                                        <div className="rules-section">
                                            <h5>Rules:</h5>
                                            <ul>
                                                {currentData.rules && currentData.rules.map((rule, idx) => (
                                                    <li key={idx}>{rule}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="rules-section">
                                            <h5>Penalties:</h5>
                                            <ul>
                                                {currentData.penalties && currentData.penalties.map((penalty, idx) => (
                                                    <li key={idx}>{penalty}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="hud-controls">
                                <button onClick={handleHint} className="hud-btn hint-btn">
                                    💡 Hint
                                </button>
                                {/* Skip button removed from UI - skip functionality still available via arrow button */}
                            </div>
                        </div>



                        {/* Hint Modal */}
                        {showHint && (
                            <div className="hint-modal-overlay">
                                <div className="hint-modal">
                                    <h3>💡 Hint</h3>
                                    <div className="hint-text-box">
                                        {currentData.hint}
                                    </div>
                                    <button onClick={() => setShowHint(false)} className="close-hint-btn">Got it</button>
                                </div>
                            </div>
                        )}



                        <div className="challenge-wrapper">
                            {renderChallenge()}
                        </div>
                    </div>

                    {/* Next Challenge Arrow */}
                    {currentChallenge < totalChallenges && (
                        <div className="next-challenge-arrow" onClick={handleSkip} title="Skip to Next Challenge">
                            ➤
                        </div>
                    )}
                </div>
            )}
            {gameState === 'result' && <ResultScreen score={score} userInfo={userInfo} />}
        </div>
    );
};

export default Round2Manager;
