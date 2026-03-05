import { useEffect, useState, useMemo } from 'react';
import { MessageCircle } from 'lucide-react';

const LoadingScreen = () => {
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('Đang khởi tạo');

    // Memoize particles to prevent re-renders
    const particles = useMemo(
        () =>
            Array.from({ length: 30 }).map((_, i) => ({
                id: i,
                size: Math.random() * 2 + 1,
                x: Math.random() * 100,
                y: Math.random() * 100,
                dur: Math.random() * 6 + 4,
                delay: Math.random() * 5,
                hue: 260 + Math.random() * 80,
                opacity: Math.random() * 0.5 + 0.1,
            })),
        []
    );

    useEffect(() => {
        const steps = [
            { at: 12, text: 'Đang kết nối máy chủ' },
            { at: 30, text: 'Đang xác thực tài khoản' },
            { at: 50, text: 'Đang tải dữ liệu' },
            { at: 70, text: 'Đang đồng bộ tin nhắn' },
            { at: 88, text: 'Sắp hoàn tất' },
        ];

        const interval = setInterval(() => {
            setProgress((prev) => {
                const next = prev + Math.random() * 6 + 1.5;
                const capped = Math.min(next, 96);
                const step = steps.find((s) => prev < s.at && capped >= s.at);
                if (step) setStatusText(step.text);
                return capped;
            });
        }, 180);

        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                userSelect: 'none',
                background:
                    'radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #0d0d1a 50%, #080812 100%)',
            }}
        >
            {/* Ambient orbs */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        width: 700,
                        height: 700,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)',
                        top: '-20%',
                        left: '-15%',
                        filter: 'blur(60px)',
                        animation: 'ls-drift1 14s ease-in-out infinite',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        width: 550,
                        height: 550,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(236,72,153,0.14) 0%, transparent 65%)',
                        bottom: '-15%',
                        right: '-10%',
                        filter: 'blur(60px)',
                        animation: 'ls-drift2 18s ease-in-out infinite',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        width: 400,
                        height: 400,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 65%)',
                        top: '40%',
                        left: '55%',
                        filter: 'blur(50px)',
                        animation: 'ls-drift3 12s ease-in-out infinite',
                    }}
                />

                {/* Floating particles */}
                {particles.map((p) => (
                    <div
                        key={p.id}
                        style={{
                            position: 'absolute',
                            borderRadius: '50%',
                            width: p.size,
                            height: p.size,
                            background: `hsla(${p.hue}, 70%, 65%, ${p.opacity})`,
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            animation: `ls-float ${p.dur}s ease-in-out infinite`,
                            animationDelay: `${p.delay}s`,
                            boxShadow: `0 0 ${p.size * 3}px hsla(${p.hue}, 70%, 65%, ${p.opacity * 0.5})`,
                        }}
                    />
                ))}
            </div>

            {/* Main content */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                {/* Logo area */}
                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 44,
                    }}
                >
                    {/* Outer glow pulse */}
                    <div
                        style={{
                            position: 'absolute',
                            width: 160,
                            height: 160,
                            borderRadius: '50%',
                            background:
                                'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
                            animation: 'ls-glow 3s ease-in-out infinite',
                        }}
                    />

                    {/* Ring 1 - outer */}
                    <div
                        style={{
                            position: 'absolute',
                            width: 130,
                            height: 130,
                            borderRadius: '50%',
                            border: '2px solid transparent',
                            borderTopColor: 'rgba(139,92,246,0.6)',
                            borderRightColor: 'rgba(236,72,153,0.3)',
                            animation: 'ls-spin 3s linear infinite',
                            filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.3))',
                        }}
                    />

                    {/* Ring 2 - reverse */}
                    <div
                        style={{
                            position: 'absolute',
                            width: 106,
                            height: 106,
                            borderRadius: '50%',
                            border: '1.5px solid transparent',
                            borderBottomColor: 'rgba(59,130,246,0.5)',
                            borderLeftColor: 'rgba(139,92,246,0.25)',
                            animation: 'ls-spin 4s linear infinite reverse',
                        }}
                    />

                    {/* Ring 3 - dashed outer */}
                    <div
                        style={{
                            position: 'absolute',
                            width: 150,
                            height: 150,
                            borderRadius: '50%',
                            border: '1px dashed rgba(139,92,246,0.1)',
                            animation: 'ls-spin 25s linear infinite',
                        }}
                    />

                    {/* Icon container */}
                    <div
                        style={{
                            position: 'relative',
                            width: 68,
                            height: 68,
                            borderRadius: 20,
                            background:
                                'linear-gradient(135deg, #8b5cf6 0%, #a855f7 40%, #ec4899 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow:
                                '0 0 50px rgba(139,92,246,0.35), 0 0 100px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
                            animation: 'ls-icon-breathe 3s ease-in-out infinite',
                        }}
                    >
                        <MessageCircle
                            style={{
                                width: 32,
                                height: 32,
                                color: '#fff',
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                            }}
                            strokeWidth={2.5}
                        />
                    </div>
                </div>

                {/* App name */}
                <h1
                    style={{
                        fontSize: 48,
                        fontWeight: 900,
                        letterSpacing: '-1.5px',
                        lineHeight: 1,
                        margin: '0 0 8px 0',
                        background:
                            'linear-gradient(180deg, #ffffff 0%, #ffffff 40%, rgba(255,255,255,0.3) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                >
                    Message
                </h1>

                {/* Tagline */}
                <p
                    style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.2)',
                        letterSpacing: '0.35em',
                        textTransform: 'uppercase',
                        margin: '0 0 40px 0',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                >
                    Nhắn tin · Gọi điện · Kết nối
                </p>

                {/* Progress area */}
                <div
                    style={{
                        width: 240,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    {/* Progress bar track */}
                    <div
                        style={{
                            width: '100%',
                            height: 3,
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                            position: 'relative',
                        }}
                    >
                        {/* Progress fill */}
                        <div
                            style={{
                                height: '100%',
                                borderRadius: 10,
                                width: `${progress}%`,
                                background: 'linear-gradient(90deg, #8b5cf6, #a855f7, #ec4899)',
                                transition: 'width 0.25s ease-out',
                                position: 'relative',
                                boxShadow:
                                    '0 0 16px rgba(139,92,246,0.5), 0 0 4px rgba(139,92,246,0.8)',
                            }}
                        >
                            {/* Shimmer */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background:
                                        'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                                    animation: 'ls-shimmer 1.8s infinite',
                                }}
                            />
                        </div>
                    </div>

                    {/* Status row */}
                    <div
                        style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 10,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {/* Animated dot */}
                            <div
                                style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: '50%',
                                    background: '#a855f7',
                                    boxShadow: '0 0 8px rgba(168,85,247,0.6)',
                                    animation: 'ls-dot-pulse 1.5s ease-in-out infinite',
                                }}
                            />
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 500,
                                    color: 'rgba(255,255,255,0.3)',
                                    fontFamily:
                                        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                }}
                            >
                                {statusText}
                            </span>
                        </div>
                        <span
                            style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: 'rgba(255,255,255,0.2)',
                                fontFamily: 'monospace',
                            }}
                        >
                            {Math.round(progress)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom section */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 20,
                }}
            >
                {/* Feature badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    {[
                        { emoji: '🔐', label: 'Mã hóa', delay: '0.6s' },
                        { emoji: '⚡', label: 'Nhanh chóng', delay: '0.8s' },
                        { emoji: '🛡️', label: 'An toàn', delay: '1.0s' },
                    ].map((item) => (
                        <div
                            key={item.label}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                opacity: 0,
                                animation: `ls-fade-up 0.6s ease-out ${item.delay} forwards`,
                            }}
                        >
                            <span style={{ fontSize: 11 }}>{item.emoji}</span>
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: 'rgba(255,255,255,0.25)',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    fontFamily:
                                        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                }}
                            >
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Version line */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    <span
                        style={{
                            fontSize: 9,
                            fontWeight: 500,
                            color: 'rgba(255,255,255,0.12)',
                            letterSpacing: '0.4em',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        }}
                    >
                        v1.0
                    </span>
                    <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>
            </div>

            {/* Keyframes */}
            <style>{`
                @keyframes ls-drift1 {
                    0%, 100% { transform: translate(0,0) scale(1); }
                    33% { transform: translate(40px,-30px) scale(1.1); }
                    66% { transform: translate(-20px,20px) scale(0.95); }
                }
                @keyframes ls-drift2 {
                    0%, 100% { transform: translate(0,0) scale(1); }
                    33% { transform: translate(-30px,25px) scale(1.08); }
                    66% { transform: translate(25px,-20px) scale(0.92); }
                }
                @keyframes ls-drift3 {
                    0%, 100% { transform: translate(0,0) scale(1); opacity:0.1; }
                    50% { transform: translate(-15px,10px) scale(1.15); opacity:0.2; }
                }
                @keyframes ls-spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes ls-glow {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.2); opacity: 1; }
                }
                @keyframes ls-icon-breathe {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 50px rgba(139,92,246,0.35), 0 0 100px rgba(139,92,246,0.15); }
                    50% { transform: scale(1.04); box-shadow: 0 0 60px rgba(139,92,246,0.5), 0 0 120px rgba(139,92,246,0.25); }
                }
                @keyframes ls-shimmer {
                    0% { transform: translateX(-150%); }
                    100% { transform: translateX(250%); }
                }
                @keyframes ls-float {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
                    50% { transform: translateY(-25px) scale(1.5); opacity: 0.8; }
                }
                @keyframes ls-dot-pulse {
                    0%, 100% { opacity: 0.4; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.3); }
                }
                @keyframes ls-fade-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
