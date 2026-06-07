import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, LogIn, User, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';

const Login = () => {
    const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState('');
    const [tmpId, setTmpId] = useState('');
    const [verificationPrompt, setVerificationPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

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

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length < 6 || !tmpId) return;
        setIsLoading(true);
        try {
            await login(username, password, otp, tmpId);
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

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 font-sans bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/sky image.jpg')" }}
        >
            {/* Subtle Overlay to ensure readability and enhance glassmorphism */}
            <div className="absolute inset-0 z-0 bg-white/10 backdrop-blur-[2px]" />

            <div className="w-full max-w-md z-10 relative mb-8">
                {/* Branding Logo (Floating) */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-white/90 backdrop-blur-xl rounded-[1.25rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 flex items-center justify-center">
                        <LogIn className="w-8 h-8 text-purple-600" />
                    </div>
                </div>

                <Card className="border-white/40 bg-white/40 backdrop-blur-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden transition-all duration-500">
                    <CardHeader className="space-y-2 text-center pt-10 pb-6 relative">
                        {step === '2fa' && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute left-6 top-6 hover:bg-white/20 rounded-full h-8 w-8 text-slate-600"
                                onClick={() => setStep('credentials')}
                                disabled={isLoading}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <CardTitle className="text-2xl font-black tracking-tight text-slate-900 drop-shadow-sm">
                            {step === 'credentials' ? "Sign in to your account" : "Verify code"}
                        </CardTitle>
                        <CardDescription className="text-slate-600 font-medium px-4">
                            {step === 'credentials'
                                ? "Experience the future of CRM with absolute clarity and control."
                                : (verificationPrompt || "Enter the verification code sent to your registered device.")}
                        </CardDescription>
                    </CardHeader>

                    {step === 'credentials' ? (
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
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</Label>
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
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            disabled={isLoading}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-5 px-8 pt-6 pb-10">
                                <Button
                                    className="w-full h-14 rounded-2xl font-bold text-lg bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    type="submit"
                                    disabled={isLoading || !username || !password}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Signing in...</span>
                                        </div>
                                    ) : (
                                        "Sign In"
                                    )}
                                </Button>

                                <div className="flex items-center justify-center gap-2 w-full">
                                    <div className="h-px bg-slate-200 flex-1" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Or Support</span>
                                    <div className="h-px bg-slate-200 flex-1" />
                                </div>
                                <button type="button" className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors uppercase tracking-tight">
                                    Need help with your account?
                                </button>
                            </CardFooter>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp}>
                            <CardContent className="space-y-6 flex flex-col items-center px-8">
                                <div className="space-y-4 text-center w-full">
                                    <Label htmlFor="otp" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type your code below</Label>
                                    <div className="flex justify-center w-full">
                                        <InputOTP
                                            id="otp"
                                            maxLength={6}
                                            value={otp}
                                            onChange={(val) => setOtp(val)}
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
