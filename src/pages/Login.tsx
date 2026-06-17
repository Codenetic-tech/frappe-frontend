import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, LogIn, User, Lock, Eye, EyeOff, Mail, QrCode, Smartphone, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useFrappePostCall } from 'frappe-react-sdk';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';

// ── Password Strength ──────────────────────────────────────────────────────
const PASSWORD_RULES = [
    { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { id: 'upper', label: 'At least one uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { id: 'lower', label: 'At least one lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { id: 'number', label: 'At least one number', test: (p: string) => /[0-9]/.test(p) },
    { id: 'special', label: 'At least one special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const getPasswordStrength = (p: string) => {
    const passed = PASSWORD_RULES.filter(r => r.test(p)).length;
    if (passed <= 1) return { score: passed, label: 'Weak', color: 'bg-red-500' };
    if (passed === 2) return { score: passed, label: 'Fair', color: 'bg-orange-400' };
    if (passed === 3) return { score: passed, label: 'Good', color: 'bg-yellow-400' };
    if (passed === 4) return { score: passed, label: 'Strong', color: 'bg-emerald-400' };
    return { score: passed, label: 'Very Strong', color: 'bg-emerald-500' };
};
// ────────────────────────────────────────────────────────────────────────────

const getErrorMessage = (error: any): string => {
    if (error.message && error.message !== 'There was an error.') {
        return error.message;
    }
    if (error._server_messages) {
        try {
            const serverMsgs = JSON.parse(error._server_messages);
            if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
                const firstMsg = typeof serverMsgs[0] === 'string' ? JSON.parse(serverMsgs[0]) : serverMsgs[0];
                if (firstMsg && firstMsg.message) {
                    return firstMsg.message;
                }
            }
        } catch (e) {
            console.error("Failed to parse _server_messages", e);
        }
    }
    if (error.exception) {
        return error.exception;
    }
    return "An error occurred. Please try again.";
};

const Login = () => {
    const [step, setStep] = useState<
        'credentials' | '2fa' |
        'forgot-email' | 'forgot-code' | 'forgot-reset' |
        'totp-verify' | 'totp-setup-email' | 'totp-setup-verify-email' | 'totp-setup-scan'
    >('credentials');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState('');
    const [tmpId, setTmpId] = useState('');
    const [verificationPrompt, setVerificationPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Forgot Password States
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotCode, setForgotCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // TOTP states
    const [totpVerifyCode, setTotpVerifyCode] = useState('');
    const [totpSetupEmail, setTotpSetupEmail] = useState('');
    const [totpSetupEmailCode, setTotpSetupEmailCode] = useState('');
    const [totpScanImage, setTotpScanImage] = useState('');
    const [totpSecKey, setTotpSecKey] = useState('');
    const [totpSetupCode, setTotpSetupCode] = useState('');

    const { login, loginWithoutPassword } = useAuth();
    const navigate = useNavigate();

    // Custom API Hooks for Forgot Password
    const { call: sendResetCodeApi, loading: isSendingCode } = useFrappePostCall('gopocket.api.send_reset_password_code');
    const { call: verifyResetCodeApi, loading: isVerifyingCode } = useFrappePostCall('gopocket.api.verify_reset_password_code');
    const { call: resetPasswordApi, loading: isResettingPassword } = useFrappePostCall('gopocket.api.reset_password_with_code');

    // Custom API Hooks for TOTP
    const { call: sendTotpSetupCodeApi, loading: isSendingTotpSetupCode } = useFrappePostCall('gopocket.api.send_totp_setup_code');
    const { call: verifyTotpSetupCodeApi, loading: isVerifyingTotpSetupCode } = useFrappePostCall('gopocket.api.verify_totp_setup_code');
    const { call: confirmTotpAndLoginApi, loading: isConfirmingTotp } = useFrappePostCall('gopocket.api.confirm_totp_and_login');
    const { call: loginWithTotpApi, loading: isLoggingInWithTotp } = useFrappePostCall('gopocket.api.login_with_totp');
    const { call: checkUserCredentialsApi, loading: isCheckingCredentials } = useFrappePostCall('gopocket.api.check_user_credentials');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;
        setIsLoading(true);
        try {
            const res = await login(username, password);
            if (res && res.requiresOtp) {
                setTmpId(res.tmp_id);
                setVerificationPrompt(res.verification?.prompt || "Verification code has been sent.");
                setStep('2fa');
                setOtp(''); // Reset OTP input
                toast({
                    variant: "default",
                    title: "2FA Required",
                    description: res.verification?.prompt || "Please enter the code sent to your email.",
                });
            } else {
                toast({
                    variant: "success",
                    title: "Login Successful",
                    description: "Welcome back!",
                    duration: 3000,
                });
                navigate('/');
            }
        } catch (error: any) {
            console.error("Login failed:", error);
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: error.message || "Invalid username or password. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e?: React.FormEvent, customOtp?: string) => {
        if (e) e.preventDefault();
        const codeToVerify = customOtp || otp;
        if (!codeToVerify || codeToVerify.length < 6 || !tmpId) return;
        setIsLoading(true);
        try {
            await login(username, password, codeToVerify, tmpId);
            toast({
                variant: "success",
                title: "Login Successful",
                description: "Welcome back!",
                duration: 3000,
            });
            navigate('/');
        } catch (error: any) {
            console.error("OTP verification failed:", error);
            toast({
                variant: "destructive",
                title: "Verification Failed",
                description: error.message || "Invalid or expired verification code.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendResetCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail) return;
        try {
            await sendResetCodeApi({ email: forgotEmail });
            toast({
                variant: "default",
                title: "Code Sent",
                description: "A 6-digit verification code has been sent to your email address.",
            });
            setStep('forgot-code');
            setForgotCode(''); // Reset code input
        } catch (error: any) {
            console.error("Failed to send reset code:", error);
            toast({
                variant: "destructive",
                title: "Error Sending Code",
                description: error.message || "Could not send verification code. Please check your email and try again.",
            });
        }
    };

    const handleVerifyResetCode = async (e?: React.FormEvent, customCode?: string) => {
        if (e) e.preventDefault();
        const codeToVerify = customCode || forgotCode;
        if (!forgotEmail || !codeToVerify || codeToVerify.length < 6) return;
        try {
            await verifyResetCodeApi({ email: forgotEmail, code: codeToVerify });
            toast({
                variant: "success",
                title: "Code Verified",
                description: "Verification code verified successfully. Please enter your new password.",
            });
            setStep('forgot-reset');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error: any) {
            console.error("Failed to verify reset code:", error);
            toast({
                variant: "destructive",
                title: "Verification Failed",
                description: error.message || "Invalid or expired verification code.",
            });
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail || !forgotCode || !newPassword || !confirmNewPassword) return;
        if (newPassword !== confirmNewPassword) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Passwords do not match.",
            });
            return;
        }

        try {
            await resetPasswordApi({
                email: forgotEmail,
                code: forgotCode,
                new_password: newPassword,
                confirm_new_password: confirmNewPassword
            });

            toast({
                variant: "success",
                title: "Success",
                description: "Password reset successfully. Logging you in...",
            });

            // Automatically log the user in on the frontend
            await loginWithoutPassword(forgotEmail);

            navigate('/');
        } catch (error: any) {
            console.error("Password reset failed:", error);
            toast({
                variant: "destructive",
                title: "Password Reset Failed",
                description: error.message || "An error occurred during password reset. Please try again.",
            });
        }
    };

    // TOTP Handlers
    const handleSendTotpSetupCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!totpSetupEmail) return;
        try {
            await sendTotpSetupCodeApi({ email: totpSetupEmail });
            toast({
                variant: "default",
                title: "Code Sent",
                description: "A verification code has been sent to your email for TOTP setup.",
            });
            setStep('totp-setup-verify-email');
            setTotpSetupEmailCode('');
        } catch (error: any) {
            console.error("Failed to send TOTP setup code:", error);
            const errorMsg = getErrorMessage(error);
            toast({
                variant: "destructive",
                title: "Error Sending Code",
                description: errorMsg,
            });
        }
    };

    const handleVerifyTotpSetupCode = async (e?: React.FormEvent, customCode?: string) => {
        if (e) e.preventDefault();
        const codeToVerify = customCode || totpSetupEmailCode;
        if (!totpSetupEmail || !codeToVerify || codeToVerify.length < 6) return;
        try {
            const res = await verifyTotpSetupCodeApi({ email: totpSetupEmail, code: codeToVerify });
            const data = res?.message || res;
            if (data && data.result && data.result[0]) {
                setTotpScanImage(data.result[0].scanImge);
                setTotpSecKey(data.result[0].secKey);
                toast({
                    variant: "success",
                    title: "Email Verified",
                    description: "Please scan the QR code to set up TOTP in your authenticator app.",
                });
                setStep('totp-setup-scan');
                setTotpSetupCode('');
            } else {
                throw new Error("Invalid response structure from backend");
            }
        } catch (error: any) {
            console.error("Failed to verify TOTP setup code:", error);
            const errorMsg = getErrorMessage(error);
            toast({
                variant: "destructive",
                title: "Verification Failed",
                description: errorMsg,
            });
            setStep('totp-setup-email');
        }
    };

    const handleConfirmTotpAndLogin = async (e?: React.FormEvent, customCode?: string) => {
        if (e) e.preventDefault();
        const codeToVerify = customCode || totpSetupCode;
        if (!totpSetupEmail || !codeToVerify || codeToVerify.length < 6) return;
        try {
            await confirmTotpAndLoginApi({ email: totpSetupEmail, totp_code: codeToVerify });
            toast({
                variant: "success",
                title: "TOTP Enabled",
                description: "TOTP has been successfully set up and enabled. Logging you in...",
            });
            await loginWithoutPassword(totpSetupEmail);
            navigate('/');
        } catch (error: any) {
            console.error("Failed to confirm TOTP:", error);
            toast({
                variant: "destructive",
                title: "Setup Confirmation Failed",
                description: error.message || "Invalid TOTP code. Please check your authenticator app.",
            });
        }
    };

    const handleLoginWithTotp = async (e?: React.FormEvent, customCode?: string) => {
        if (e) e.preventDefault();
        const codeToVerify = customCode || totpVerifyCode;
        if (!username || !codeToVerify || codeToVerify.length < 6) return;
        try {
            await loginWithTotpApi({ email: username, totp_code: codeToVerify });
            toast({
                variant: "success",
                title: "Login Successful",
                description: "Welcome back!",
            });
            await loginWithoutPassword(username);
            navigate('/');
        } catch (error: any) {
            console.error("Failed to login with TOTP:", error);
            const errorMsg = getErrorMessage(error);

            toast({
                variant: "destructive",
                title: "Authentication Failed",
                description: errorMsg,
            });

            if (
                errorMsg.includes("TOTP is not enabled for this user") ||
                (error.exc_type === "ValidationError" && errorMsg.includes("TOTP is not enabled"))
            ) {
                setStep('credentials');
            }
        }
    };

    const handleCopySecretKey = () => {
        if (!totpSecKey) return;
        navigator.clipboard.writeText(totpSecKey);
        toast({
            variant: "success",
            title: "Copied!",
            description: "Secret key has been copied to your clipboard.",
        });
    };

    const handleGoToTotpVerify = async () => {
        if (!username || !password) {
            toast({
                variant: "destructive",
                title: "Credentials required",
                description: "Please enter both your Username / Employee ID and Password to sign in with TOTP.",
            });
            return;
        }
        try {
            await checkUserCredentialsApi({ email: username, password: password });
            setStep('totp-verify');
            setTotpVerifyCode('');
        } catch (error: any) {
            console.error("Credentials verification failed:", error);
            const errorMsg = getErrorMessage(error);
            toast({
                variant: "destructive",
                title: "Verification Failed",
                description: errorMsg,
            });
        }
    };

    const anyForgotLoading = isSendingCode || isVerifyingCode || isResettingPassword;
    const anyTotpLoading = isSendingTotpSetupCode || isVerifyingTotpSetupCode || isConfirmingTotp || isLoggingInWithTotp || isCheckingCredentials;
    const globalLoading = isLoading || anyForgotLoading || anyTotpLoading;

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 font-sans bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/login-bg.jpg')" }}
        >
            {/* Subtle Overlay to ensure readability and enhance glassmorphism */}
            <div className="absolute inset-0 z-0 bg-white/10 backdrop-blur-[4px]" />

            <div className="w-full max-w-md z-10 relative mb-8">
                {/* Branding Logo (Floating) */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-white/90 backdrop-blur-xl rounded-[1.25rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 flex items-center justify-center">
                        <LogIn className="w-8 h-8 text-purple-600" />
                    </div>
                </div>

                <Card className="border-white/40 bg-white/40 backdrop-blur-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden transition-all duration-500">
                    <CardHeader className="space-y-2 text-center pt-10 pb-6 relative">
                        {step !== 'credentials' && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute left-6 top-6 hover:bg-white/20 rounded-full h-8 w-8 text-slate-600"
                                onClick={() => {
                                    if (step === '2fa') setStep('credentials');
                                    else if (step === 'forgot-email') setStep('credentials');
                                    else if (step === 'forgot-code') setStep('forgot-email');
                                    else if (step === 'forgot-reset') setStep('forgot-code');
                                    else if (step === 'totp-verify') setStep('credentials');
                                    else if (step === 'totp-setup-email') setStep('credentials');
                                    else if (step === 'totp-setup-verify-email') setStep('totp-setup-email');
                                    else if (step === 'totp-setup-scan') setStep('totp-setup-verify-email');
                                }}
                                disabled={globalLoading}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <CardTitle className="text-2xl font-black tracking-tight text-slate-900 drop-shadow-sm">
                            {step === 'credentials' && "Sign in to your account"}
                            {step === '2fa' && "Verify code"}
                            {step === 'forgot-email' && "Forgot Password"}
                            {step === 'forgot-code' && "Verify Reset Code"}
                            {step === 'forgot-reset' && "Reset Password"}
                            {step === 'totp-verify' && "Sign In with TOTP"}
                            {step === 'totp-setup-email' && "Setup TOTP - Step 1"}
                            {step === 'totp-setup-verify-email' && "Setup TOTP - Step 2"}
                            {step === 'totp-setup-scan' && "Setup TOTP - Step 3"}
                        </CardTitle>
                        <CardDescription className="text-slate-600 font-medium px-4">
                            {step === 'credentials' && "Experience the future of CRM with absolute clarity and control."}
                            {step === '2fa' && (verificationPrompt || "Enter the verification code sent to your registered device.")}
                            {step === 'forgot-email' && "Enter your email address to receive a password reset verification code."}
                            {step === 'forgot-code' && `Enter the 6-digit code sent to ${forgotEmail}`}
                            {step === 'forgot-reset' && "Enter and confirm your new password below."}
                            {step === 'totp-verify' && `Enter the 6-digit TOTP code from your authenticator app for ${username}`}
                            {step === 'totp-setup-email' && "Enter your email address to receive a TOTP setup verification code."}
                            {step === 'totp-setup-verify-email' && `Enter the 6-digit verification code sent to ${totpSetupEmail}`}
                            {step === 'totp-setup-scan' && "Scan the QR code in Google Authenticator or enter the secret key manually, then confirm the generated code."}
                        </CardDescription>
                    </CardHeader>

                    {step === 'credentials' && (
                        <form onSubmit={handleLogin}>
                            <CardContent className="space-y-5 px-8">
                                {/* Username Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="username" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Username / Employee ID</Label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                                        <Input
                                            id="username"
                                            type="text"
                                            placeholder="Enter your username or ID"
                                            className="pl-12 h-14 bg-white/60 border-white/20 rounded-2xl border-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:ring-2 focus:ring-purple-500/20 text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                            disabled={globalLoading}
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <Label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</Label>
                                        <button
                                            type="button"
                                            onClick={() => setStep('forgot-email')}
                                            className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors"
                                            disabled={globalLoading}
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            className="pl-12 pr-12 h-14 bg-white/60 border-white/20 rounded-2xl border-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:ring-2 focus:ring-purple-500/20 text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            disabled={globalLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            disabled={globalLoading}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-4 px-8 pt-6 pb-10">
                                {/* Splitted Login Buttons on Same Line */}
                                <div className="flex gap-4 w-full">
                                    <Button
                                        className="flex-1 h-14 rounded-2xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        type="submit"
                                        disabled={globalLoading || !username || !password}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Signing in...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 justify-center">
                                                <Mail className="h-4 w-4 flex-shrink-0" />
                                                <span>Email OTP</span>
                                            </div>
                                        )}
                                    </Button>

                                    <Button
                                        type="button"
                                        onClick={handleGoToTotpVerify}
                                        className="flex-1 h-14 rounded-2xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        disabled={globalLoading || !username || !password}
                                    >
                                        {isCheckingCredentials ? (
                                            <div className="flex items-center gap-2 justify-center">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Checking...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 justify-center">
                                                <Smartphone className="h-4 w-4 flex-shrink-0" />
                                                <span>TOTP Login</span>
                                            </div>
                                        )}
                                    </Button>
                                </div>

                                <div className="w-full text-center mt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep('totp-setup-email');
                                            setTotpSetupEmail('');
                                        }}
                                        className="text-xs font-extrabold text-purple-600 hover:text-purple-700 transition-colors uppercase tracking-tight"
                                    >
                                        Setup TOTP (First time user?)
                                    </button>
                                </div>
                            </CardFooter>
                        </form>
                    )}

                    {step === '2fa' && (
                        <form onSubmit={handleVerifyOtp}>
                            <CardContent className="space-y-6 flex flex-col items-center px-8">
                                <div className="space-y-4 text-center w-full">
                                    <Label htmlFor="otp" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type your code below</Label>
                                    <div className="flex justify-center w-full">
                                        <InputOTP
                                            id="otp"
                                            maxLength={6}
                                            value={otp}
                                            onChange={(val) => {
                                                setOtp(val);
                                                if (val.length === 6) {
                                                    handleVerifyOtp(undefined, val);
                                                }
                                            }}
                                            disabled={isLoading}
                                        >
                                            <InputOTPGroup className="gap-2 sm:gap-3">
                                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                                    <InputOTPSlot
                                                        key={index}
                                                        index={index}
                                                        className="h-12 w-10 sm:h-14 sm:w-12 bg-white/70 border-white/40 rounded-xl shadow-sm text-xl font-bold text-slate-900 group-focus:ring-2 group-focus:ring-purple-500/20"
                                                    />
                                                ))}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-4 px-8 pt-4 pb-10">
                                <Button
                                    className="w-full h-14 rounded-2xl font-bold text-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    type="submit"
                                    disabled={isLoading || otp.length < 6}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Verifying...</span>
                                        </div>
                                    ) : (
                                        "Verify & Login"
                                    )}
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => setOtp('')}
                                    className="text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                                    disabled={isLoading}
                                >
                                    Clear Input
                                </button>
                            </CardFooter>
                        </form>
                    )}

                    {step === 'forgot-email' && (
                        <form onSubmit={handleSendResetCode}>
                            <CardContent className="space-y-5 px-8">
                                <div className="space-y-2">
                                    <Label htmlFor="forgot-email" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</Label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                                        <Input
                                            id="forgot-email"
                                            type="email"
                                            placeholder="Enter your registered email"
                                            className="pl-12 h-14 bg-white/60 border-white/20 rounded-2xl border-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:ring-2 focus:ring-purple-500/20 text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            required
                                            disabled={isSendingCode}
                                        />
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-5 px-8 pt-6 pb-10">
                                <Button
                                    className="w-full h-14 rounded-2xl font-bold text-lg bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    type="submit"
                                    disabled={isSendingCode || !forgotEmail}
                                >
                                    {isSendingCode ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Sending Code...</span>
                                        </div>
                                    ) : (
                                        "Send Verification Code"
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    )}

                    {step === 'forgot-code' && (
                        <form onSubmit={handleVerifyResetCode}>
                            <CardContent className="space-y-6 flex flex-col items-center px-8">
                                <div className="space-y-4 text-center w-full">
                                    <Label htmlFor="forgot-code" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type your code below</Label>
                                    <div className="flex justify-center w-full">
                                        <InputOTP
                                            id="forgot-code"
                                            maxLength={6}
                                            value={forgotCode}
                                            onChange={(val) => {
                                                setForgotCode(val);
                                                if (val.length === 6) {
                                                    handleVerifyResetCode(undefined, val);
                                                }
                                            }}
                                            disabled={isVerifyingCode}
                                        >
                                            <InputOTPGroup className="gap-2 sm:gap-3">
                                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                                    <InputOTPSlot
                                                        key={index}
                                                        index={index}
                                                        className="h-12 w-10 sm:h-14 sm:w-12 bg-white/70 border-white/40 rounded-xl shadow-sm text-xl font-bold text-slate-900 group-focus:ring-2 group-focus:ring-purple-500/20"
                                                    />
                                                ))}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-4 px-8 pt-4 pb-10">
                                <Button
                                    className="w-full h-14 rounded-2xl font-bold text-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    type="submit"
                                    disabled={isVerifyingCode || forgotCode.length < 6}
                                >
                                    {isVerifyingCode ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Verifying...</span>
                                        </div>
                                    ) : (
                                        "Verify Code"
                                    )}
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => setForgotCode('')}
                                    className="text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                                    disabled={isVerifyingCode}
                                >
                                    Clear Input
                                </button>
                            </CardFooter>
                        </form>
                    )}

                    {step === 'forgot-reset' && (() => {
                        const pwStrength = getPasswordStrength(newPassword);
                        const allRulesPassed = PASSWORD_RULES.every(r => r.test(newPassword));
                        const passwordsMatch = newPassword === confirmNewPassword;
                        const canSubmit = allRulesPassed && passwordsMatch && newPassword.length > 0 && confirmNewPassword.length > 0;
                        return (
                            <form onSubmit={handleResetPassword}>
                                <CardContent className="space-y-5 px-8">
                                    {/* New Password Field */}
                                    <div className="space-y-2">
                                        <Label htmlFor="new-password" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">New Password</Label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                                            <Input
                                                id="new-password"
                                                type={showNewPassword ? "text" : "password"}
                                                placeholder="Enter new password"
                                                className="pl-12 pr-12 h-14 bg-white/60 border-white/20 rounded-2xl border-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:ring-2 focus:ring-purple-500/20 text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                                disabled={isResettingPassword}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                disabled={isResettingPassword}
                                            >
                                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>

                                        {/* Strength Meter */}
                                        {newPassword.length > 0 && (
                                            <div className="space-y-2 pt-1">
                                                <div className="flex items-center justify-between px-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password Strength</span>
                                                    <span className={`text-[10px] font-extrabold uppercase tracking-widest transition-colors ${pwStrength.label === 'Weak' ? 'text-red-500' :
                                                        pwStrength.label === 'Fair' ? 'text-orange-400' :
                                                            pwStrength.label === 'Good' ? 'text-yellow-500' :
                                                                'text-emerald-500'
                                                        }`}>{pwStrength.label}</span>
                                                </div>
                                                {/* Segmented bar */}
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(seg => (
                                                        <div
                                                            key={seg}
                                                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${pwStrength.score >= seg ? pwStrength.color : 'bg-slate-200'
                                                                }`}
                                                        />
                                                    ))}
                                                </div>

                                                {/* Requirements checklist */}
                                                <div className="grid grid-cols-1 gap-1 pt-1 px-1">
                                                    {PASSWORD_RULES.map(rule => {
                                                        const ok = rule.test(newPassword);
                                                        return (
                                                            <div key={rule.id} className="flex items-center gap-1.5">
                                                                {ok
                                                                    ? <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                                                                    : <XCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
                                                                }
                                                                <span className={`text-[10px] font-semibold transition-colors ${ok ? 'text-emerald-600' : 'text-slate-400'
                                                                    }`}>{rule.label}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm Password Field */}
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-new-password" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</Label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                                            <Input
                                                id="confirm-new-password"
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="Confirm new password"
                                                className={`pl-12 pr-12 h-14 bg-white/60 border-white/20 rounded-2xl border-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:ring-2 focus:ring-purple-500/20 text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal ${confirmNewPassword.length > 0 && !passwordsMatch
                                                    ? 'ring-2 ring-red-400/60'
                                                    : confirmNewPassword.length > 0 && passwordsMatch
                                                        ? 'ring-2 ring-emerald-400/60'
                                                        : ''
                                                    }`}
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                required
                                                disabled={isResettingPassword}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                disabled={isResettingPassword}
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {/* Match indicator */}
                                        {confirmNewPassword.length > 0 && (
                                            <p className={`text-[10px] font-bold px-1 transition-colors ${passwordsMatch ? 'text-emerald-600' : 'text-red-500'
                                                }`}>
                                                {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>

                                <CardFooter className="flex flex-col gap-5 px-8 pt-6 pb-10">
                                    <Button
                                        className="w-full h-14 rounded-2xl font-bold text-lg bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                                        type="submit"
                                        disabled={isResettingPassword || !canSubmit}
                                    >
                                        {isResettingPassword ? (
                                            <div className="flex items-center gap-3">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                <span>Resetting Password...</span>
                                            </div>
                                        ) : (
                                            "Reset Password"
                                        )}
                                    </Button>
                                </CardFooter>
                            </form>
                        );
                    })()}

                    {step === 'totp-verify' && (
                        <form onSubmit={handleLoginWithTotp}>
                            <CardContent className="space-y-6 flex flex-col items-center px-8">
                                <div className="space-y-4 text-center w-full">
                                    <Label htmlFor="totp-otp" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authenticator Code</Label>
                                    <div className="flex justify-center w-full">
                                        <InputOTP
                                            id="totp-otp"
                                            maxLength={6}
                                            value={totpVerifyCode}
                                            onChange={(val) => {
                                                setTotpVerifyCode(val);
                                                if (val.length === 6) {
                                                    handleLoginWithTotp(undefined, val);
                                                }
                                            }}
                                            disabled={isLoggingInWithTotp}
                                        >
                                            <InputOTPGroup className="gap-2 sm:gap-3">
                                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                                    <InputOTPSlot
                                                        key={index}
                                                        index={index}
                                                        className="h-12 w-10 sm:h-14 sm:w-12 bg-white/70 border-white/40 rounded-xl shadow-sm text-xl font-bold text-slate-900 group-focus:ring-2 group-focus:ring-purple-500/20"
                                                    />
                                                ))}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-4 px-8 pt-4 pb-10">
                                <Button
                                    className="w-full h-14 rounded-2xl font-bold text-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    type="submit"
                                    disabled={isLoggingInWithTotp || totpVerifyCode.length < 6}
                                >
                                    {isLoggingInWithTotp ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Authenticating...</span>
                                        </div>
                                    ) : (
                                        "Verify & Sign In"
                                    )}
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => setTotpVerifyCode('')}
                                    className="text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                                    disabled={isLoggingInWithTotp}
                                >
                                    Clear Input
                                </button>
                            </CardFooter>
                        </form>
                    )}

                    {step === 'totp-setup-email' && (
                        <form onSubmit={handleSendTotpSetupCode}>
                            <CardContent className="space-y-5 px-8">
                                <div className="space-y-2">
                                    <Label htmlFor="totp-setup-email" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</Label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-purple-600" />
                                        <Input
                                            id="totp-setup-email"
                                            type="email"
                                            placeholder="Enter your email"
                                            className="pl-12 h-14 bg-white/60 border-white/20 rounded-2xl border-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus:ring-2 focus:ring-purple-500/20 text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                            value={totpSetupEmail}
                                            onChange={(e) => setTotpSetupEmail(e.target.value)}
                                            required
                                            disabled={isSendingTotpSetupCode}
                                        />
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-5 px-8 pt-6 pb-10">
                                <Button
                                    className="w-full h-14 rounded-2xl font-bold text-lg bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    type="submit"
                                    disabled={isSendingTotpSetupCode || !totpSetupEmail}
                                >
                                    {isSendingTotpSetupCode ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Sending Setup Code...</span>
                                        </div>
                                    ) : (
                                        "Send Setup Code"
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    )}

                    {step === 'totp-setup-verify-email' && (
                        <form onSubmit={handleVerifyTotpSetupCode}>
                            <CardContent className="space-y-6 flex flex-col items-center px-8">
                                <div className="space-y-4 text-center w-full">
                                    <Label htmlFor="totp-setup-verify-code" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type your code below</Label>
                                    <div className="flex justify-center w-full">
                                        <InputOTP
                                            id="totp-setup-verify-code"
                                            maxLength={6}
                                            value={totpSetupEmailCode}
                                            onChange={(val) => {
                                                setTotpSetupEmailCode(val);
                                                if (val.length === 6) {
                                                    handleVerifyTotpSetupCode(undefined, val);
                                                }
                                            }}
                                            disabled={isVerifyingTotpSetupCode}
                                        >
                                            <InputOTPGroup className="gap-2 sm:gap-3">
                                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                                    <InputOTPSlot
                                                        key={index}
                                                        index={index}
                                                        className="h-12 w-10 sm:h-14 sm:w-12 bg-white/70 border-white/40 rounded-xl shadow-sm text-xl font-bold text-slate-900 group-focus:ring-2 group-focus:ring-purple-500/20"
                                                    />
                                                ))}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-4 px-8 pt-4 pb-10">
                                <Button
                                    className="w-full h-14 rounded-2xl font-bold text-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    type="submit"
                                    disabled={isVerifyingTotpSetupCode || totpSetupEmailCode.length < 6}
                                >
                                    {isVerifyingTotpSetupCode ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Verifying...</span>
                                        </div>
                                    ) : (
                                        "Verify Email Code"
                                    )}
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => setTotpSetupEmailCode('')}
                                    className="text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                                    disabled={isVerifyingTotpSetupCode}
                                >
                                    Clear Input
                                </button>
                            </CardFooter>
                        </form>
                    )}

                    {step === 'totp-setup-scan' && (
                        <form onSubmit={handleConfirmTotpAndLogin}>
                            <CardContent className="space-y-6 flex flex-col items-center px-8">
                                {/* Display QR code image */}
                                {totpScanImage && (
                                    <div className="bg-white p-4 rounded-3xl shadow-md border border-white/50 flex justify-center items-center">
                                        <img
                                            src={totpScanImage}
                                            alt="Scan QR Code"
                                            className="w-40 h-40 object-contain rounded-2xl select-none pointer-events-none"
                                        />
                                    </div>
                                )}

                                {/* Display secret key manually via copy button */}
                                {totpSecKey && (
                                    <div className="w-full space-y-1.5 text-center">
                                        <button
                                            type="button"
                                            onClick={handleCopySecretKey}
                                            className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors uppercase tracking-wider underline decoration-dotted"
                                        >
                                            Click to copy secret key
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-3 text-center w-full">
                                    <Label htmlFor="totp-setup-code" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm Authenticator Code</Label>
                                    <div className="flex justify-center w-full">
                                        <InputOTP
                                            id="totp-setup-code"
                                            maxLength={6}
                                            value={totpSetupCode}
                                            onChange={(val) => {
                                                setTotpSetupCode(val);
                                                if (val.length === 6) {
                                                    handleConfirmTotpAndLogin(undefined, val);
                                                }
                                            }}
                                            disabled={isConfirmingTotp}
                                        >
                                            <InputOTPGroup className="gap-2 sm:gap-3">
                                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                                    <InputOTPSlot
                                                        key={index}
                                                        index={index}
                                                        className="h-12 w-10 sm:h-14 sm:w-12 bg-white/70 border-white/40 rounded-xl shadow-sm text-xl font-bold text-slate-900 group-focus:ring-2 group-focus:ring-purple-500/20"
                                                    />
                                                ))}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-4 px-8 pt-4 pb-10">
                                <Button
                                    className="w-full h-14 rounded-2xl font-bold text-lg bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    type="submit"
                                    disabled={isConfirmingTotp || totpSetupCode.length < 6}
                                >
                                    {isConfirmingTotp ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Enabling TOTP...</span>
                                        </div>
                                    ) : (
                                        "Verify & Enable TOTP"
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    )}
                </Card>
            </div>
            {/* Subtle Footer */}
            <div className="absolute bottom-8 text-center w-full opacity-40 pointer-events-none">
                <p className="text-[10px] font-black tracking-widest text-slate-900 uppercase">CRM Portal &middot; Secured by Gopocket</p>
            </div>
        </div>
    );
};

export default Login;
