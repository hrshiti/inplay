import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, ChevronLeft, ShieldCheck, Zap, Star } from 'lucide-react';
import paymentService from '../services/api/paymentService';
import authService from '../services/api/authService';

const MembershipPlansPage = ({ currentUser, onLoginClick, showToast }) => {
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [purchasingPlan, setPurchasingPlan] = useState(null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const data = await paymentService.getPlans();
                // Filter and sort plans to show only 3, 6, 12 months if available
                // Or just show all active plans.
                // User specifically asked for 3, 6, 12 months.
                const filteredPlans = data.filter(p =>
                    p.duration === 'quarterly' || // 3 months
                    p.duration === 'half-yearly' || // 6 months
                    p.duration === 'yearly' // 12 months
                ).sort((a, b) => a.durationInDays - b.durationInDays);

                setPlans(filteredPlans);
            } catch (err) {
                console.error("Failed to fetch plans", err);
                showToast("Failed to load membership plans");
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    const handleSubscribe = async (plan) => {
        if (!currentUser) {
            onLoginClick?.();
            return;
        }

        try {
            setPurchasingPlan(plan._id);
            showToast("Initiating Payment...");

            // 1. Create Order
            const { order } = await paymentService.createSubscriptionOrder(plan._id);

            // Handle Mock Order
            if (order.isMock) {
                showToast("Processing Internal Payment...");
                const verificationData = {
                    razorpay_order_id: order.id,
                    isMock: true
                };

                await paymentService.verifySubscriptionPayment(verificationData);
                showToast(`Welcome to ${plan.name}!`);

                // Refresh profile to sync subscription status
                await authService.getProfile();
                navigate('/');
                return;
            }

            // 2. Real Razorpay Flow
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "InPlay Membership",
                description: plan.name,
                order_id: order.id,
                handler: async function (response) {
                    try {
                        showToast("Verifying Payment...");
                        const verificationData = {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        };

                        await paymentService.verifySubscriptionPayment(verificationData);
                        showToast("Membership Activated Successfully!");

                        await authService.getProfile();
                        navigate('/');
                    } catch (err) {
                        console.error("Verification Failed", err);
                        showToast(err.message || "Payment Verification Failed");
                    }
                },
                prefill: {
                    name: currentUser.name,
                    email: currentUser.email,
                    contact: currentUser.phone || ""
                },
                theme: {
                    color: "#E50914"
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                showToast("Payment Failed: " + (response.error.description || response.error.reason));
            });
            rzp.open();

        } catch (error) {
            console.error("Subscription Error", error);
            showToast(error.message || "Failed to initiate subscription");
        } finally {
            setPurchasingPlan(null);
        }
    };

    if (loading) {
        return (
            <div className="plans-page loading">
                <div className="spinner"></div>
                <p>Loading premium plans...</p>
            </div>
        );
    }

    return (
        <div className="plans-page">
            <header className="plans-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ChevronLeft size={24} />
                </button>
                <h1>Choose Your Membership</h1>
            </header>

            <div className="plans-benefits">
                <div className="benefit-item">
                    <Zap size={20} className="icon gold" />
                    <span>Watch everything for FREE</span>
                </div>
                <div className="benefit-item">
                    <ShieldCheck size={20} className="icon gold" />
                    <span>Ad-free experience</span>
                </div>
                <div className="benefit-item">
                    <Check size={20} className="icon gold" />
                    <span>Cancel anytime</span>
                </div>
            </div>

            <div className="plans-container">
                {plans.length > 0 ? (
                    plans.map((plan) => (
                        <div key={plan._id} className={`plan-card ${plan.isPopular ? 'popular' : ''}`}>
                            {plan.isPopular && <div className="popular-badge">MOST POPULAR</div>}
                            <div className="plan-name">
                                {plan.duration === 'yearly' && <Star size={20} className="gold" />}
                                {plan.name}
                            </div>
                            <div className="plan-price">
                                <span className="currency">₹</span>
                                <span className="amount">{plan.price}</span>
                                <span className="period">/{plan.duration === 'half-yearly' ? '6 months' : plan.duration === 'quarterly' ? '3 months' : '12 months'}</span>
                            </div>
                            <ul className="plan-features">
                                {plan.features.map((feature, i) => (
                                    <li key={i}><Check size={16} /> {feature}</li>
                                ))}
                                <li><Check size={16} /> High Quality Streaming</li>
                                <li><Check size={16} /> Device Support: {plan.maxDevices}</li>
                            </ul>
                            <button
                                className={`subscribe-btn ${purchasingPlan === plan._id ? 'loading' : ''}`}
                                onClick={() => handleSubscribe(plan)}
                                disabled={purchasingPlan !== null}
                            >
                                {purchasingPlan === plan._id ? 'Processing...' : 'Become a Member'}
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="no-plans">
                        <Crown size={48} color="#FFD700" />
                        <p>No membership plans available at the moment.</p>
                        <p className="sub">Please check back later or contact support.</p>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .plans-page {
                    padding: 20px;
                    min-height: 100vh;
                    background: #000;
                    color: #fff;
                    font-family: inherit;
                }
                .plans-page.loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .plans-header {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 30px;
                }
                .plans-header h1 {
                    font-size: 1.5rem;
                    margin: 0;
                    background: linear-gradient(90deg, #fff, #aaa);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .back-btn {
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: #fff;
                    padding: 8px;
                    border-radius: 50%;
                    cursor: pointer;
                }
                .plans-benefits {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 15px;
                    margin-bottom: 40px;
                    justify-content: center;
                }
                .benefit-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255,255,255,0.05);
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .icon.gold { color: #FFD700; }
                .plans-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 25px;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .plan-card {
                    background: #111;
                    padding: 30px;
                    border-radius: 20px;
                    position: relative;
                    border: 1px solid #222;
                    transition: transform 0.3s ease, border-color 0.3s ease;
                    display: flex;
                    flex-direction: column;
                }
                .plan-card:hover {
                    transform: translateY(-5px);
                    border-color: #444;
                }
                .plan-card.popular {
                    border-color: #FFD700;
                    background: linear-gradient(180deg, #111 0%, #0a0a0a 100%);
                    box-shadow: 0 10px 30px rgba(255, 215, 0, 0.1);
                }
                .popular-badge {
                    position: absolute;
                    top: -12px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #FFD700;
                    color: #000;
                    padding: 4px 12px;
                    border-radius: 10px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    letter-spacing: 1px;
                }
                .plan-name {
                    font-size: 1.2rem;
                    font-weight: 700;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .plan-price {
                    margin-bottom: 25px;
                }
                .plan-price .currency { font-size: 1.2rem; vertical-align: top; }
                .plan-price .amount { font-size: 2.5rem; font-weight: 800; }
                .plan-price .period { color: #888; margin-left: 5px; }
                .plan-features {
                    list-style: none;
                    padding: 0;
                    margin: 0 0 30px 0;
                    flex: 1;
                }
                .plan-features li {
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.9rem;
                    color: #ccc;
                }
                .plan-features li svg { color: #46d369; }
                .subscribe-btn {
                    width: 100%;
                    padding: 15px;
                    border-radius: 12px;
                    border: none;
                    font-weight: 700;
                    font-size: 1rem;
                    cursor: pointer;
                    background: #fff;
                    color: #000;
                    transition: opacity 0.2s;
                }
                .plan-card.popular .subscribe-btn {
                    background: #FFD700;
                }
                .subscribe-btn:hover { opacity: 0.9; }
                .subscribe-btn.loading { opacity: 0.7; pointer-events: none; }
                .no-plans {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 60px 20px;
                    background: #111;
                    border-radius: 20px;
                }
                .no-plans p { margin: 20px 0 5px; font-size: 1.1rem; }
                .no-plans .sub { color: #666; font-size: 0.9rem; }
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(255,255,255,0.1);
                    border-top-color: #FFD700;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 20px;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}} />
        </div>
    );
};

export default MembershipPlansPage;
