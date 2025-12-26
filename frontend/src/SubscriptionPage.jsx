import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShieldCheck, Smartphone, Monitor, Tv, Laptop } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from './data';

export default function SubscriptionPage({ onSubscribe }) {
    const [selectedPlan, setSelectedPlan] = useState(SUBSCRIPTION_PLANS[1]); // Default to Basic

    return (
        <div className="subscription-container" style={{ padding: '24px', paddingBottom: '100px', color: 'white' }}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', textAlign: 'center' }}>
                    Choose your plan
                </h2>
                <p style={{ textAlign: 'center', color: '#aaa', marginBottom: '32px' }}>
                    Unlock premium access to all movies & shows
                </p>

                <div className="plans-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {SUBSCRIPTION_PLANS.map((plan) => {
                        const isSelected = selectedPlan.id === plan.id;
                        return (
                            <motion.div
                                key={plan.id}
                                className={`plan-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => setSelectedPlan(plan)}
                                whileTap={{ scale: 0.98 }}
                                layout
                                style={{
                                    background: isSelected ? 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))' : 'rgba(255,255,255,0.03)',
                                    border: `2px solid ${isSelected ? plan.color : 'transparent'}`,
                                    borderRadius: '16px',
                                    padding: '20px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {isSelected && (
                                    <motion.div
                                        layoutId="active-glow"
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: `radial-gradient(circle at center, ${plan.color}22 0%, transparent 70%)`,
                                            zIndex: 0
                                        }}
                                    />
                                )}

                                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: isSelected ? plan.color : 'white' }}>
                                            {plan.name}
                                        </h3>
                                        <div style={{ fontSize: '14px', color: '#aaa', marginTop: '4px' }}>
                                            {plan.resolution}  •  {plan.quality}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: '700' }}>
                                        {plan.price}<span style={{ fontSize: '12px', fontWeight: '400', color: '#aaa' }}>/mo</span>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isSelected && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '16px' }} />

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                                {plan.features.map((feature, i) => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ddd' }}>
                                                        <Check size={14} color={plan.color} /> {feature}
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ display: 'flex', gap: '12px', color: '#aaa' }}>
                                                {plan.devices.includes('Mobile') && <Smartphone size={18} />}
                                                {plan.devices.includes('Computer') && <Laptop size={18} />}
                                                {plan.devices.includes('TV') && <Tv size={18} />}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {isSelected && (
                                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                        <div style={{ background: plan.color, borderRadius: '50%', padding: '4px' }}>
                                            <Check size={12} color="white" strokeWidth={4} />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onSubscribe}
                    style={{
                        width: '100%',
                        background: selectedPlan.color,
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '16px',
                        fontSize: '16px',
                        fontWeight: '700',
                        marginTop: '32px',
                        boxShadow: `0 8px 24px ${selectedPlan.color}44`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <ShieldCheck size={20} />
                    Subscribe to {selectedPlan.name}
                </motion.button>

                <p style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '16px' }}>
                    Recurring billing. Cancel anytime.
                </p>
            </motion.div>
        </div>
    );
}
