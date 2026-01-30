// ملف: auth-check.js
// نظام التحقق من تسجيل الدخول للصفحات الإدارية

class AuthChecker {
    constructor() {
        this.authTimeout = null;
        this.checkInterval = 5 * 60 * 1000; // التحقق كل 5 دقائق
        this.redirectDelay = 2000; // تأخير إعادة التوجيه 2 ثانية
        this.init();
    }

    // تهيئة النظام
    init() {
        console.log("🔒 بدء نظام التحقق من المصادقة...");
        
        // التحقق فوراً عند تحميل الصفحة
        this.checkAuthStatus();
        
        // إضافة مستمع لتغييرات المصادقة
        this.setupAuthListeners();
        
        // التحقق الدوري
        this.setupPeriodicCheck();
        
        // إضافة زر تسجيل الخروج
        this.addLogoutButton();
    }

    // التحقق من حالة المصادقة
    checkAuthStatus() {
        const userData = localStorage.getItem('alfajr_user');
        const sessionExpiry = localStorage.getItem('alfajr_session_expiry');
        
        console.log("🔍 التحقق من بيانات المصادقة...");
        
        if (!userData || !sessionExpiry) {
            console.log("❌ لا توجد بيانات مصادقة في localStorage");
            this.redirectToLogin();
            return false;
        }
        
        const now = new Date().getTime();
        const expiryTime = parseInt(sessionExpiry, 10);
        
        if (now > expiryTime) {
            console.log("❌ انتهت مدة الجلسة");
            this.clearAuthData();
            this.redirectToLogin();
            return false;
        }
        
        try {
            const user = JSON.parse(userData);
            console.log("✅ المستخدم مسجل:", user.email);
            
            // تحديث واجهة المستخدم
            this.updateUI(user);
            
            // تحديث وقت انتهاء الجلسة (تمديدها)
            this.extendSession();
            
            return true;
        } catch (error) {
            console.error("❌ خطأ في تحليل بيانات المستخدم:", error);
            this.clearAuthData();
            this.redirectToLogin();
            return false;
        }
    }

    // تمديد الجلسة
    extendSession() {
        const sessionExpiry = new Date().getTime() + (8 * 60 * 60 * 1000);
        localStorage.setItem('alfajr_session_expiry', sessionExpiry.toString());
        console.log("⏰ تم تمديد الجلسة لمدة 8 ساعات إضافية");
    }

    // إعداد مستمعات المصادقة
    setupAuthListeners() {
        // استماع لتغييرات localStorage من النوافذ الأخرى
        window.addEventListener('storage', (event) => {
            if (event.key === 'alfajr_user' && !event.newValue) {
                console.log("🔓 تم تسجيل الخروج من نافذة أخرى");
                this.showLogoutMessage();
                setTimeout(() => {
                    this.redirectToLogin();
                }, this.redirectDelay);
            }
            
            if (event.key === 'alfajr_auth_status' && event.newValue === 'logout') {
                console.log("🔓 استقبال إشارة تسجيل الخروج");
                this.showLogoutMessage();
                setTimeout(() => {
                    this.redirectToLogin();
                }, this.redirectDelay);
            }
        });

        // استماع للأحداث المخصصة
        window.addEventListener('alfajr_logout', () => {
            console.log("🔓 استقبال حدث تسجيل الخروج المخصص");
            this.showLogoutMessage();
            setTimeout(() => {
                this.redirectToLogin();
            }, this.redirectDelay);
        });

        // التحقق عند إعادة تحميل الصفحة
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                console.log("🔄 إعادة تحميل الصفحة، التحقق من المصادقة...");
                this.checkAuthStatus();
            }
        });

        // التحقق عند محاولة مغادرة الصفحة
        window.addEventListener('beforeunload', () => {
            this.clearAuthTimeout();
        });

        // التحقق عند تركيز/إلغاء تركيز النافذة
        window.addEventListener('focus', () => {
            console.log("🔍 النافذة في التركيز، التحقق من المصادقة...");
            this.checkAuthStatus();
        });
    }

    // إعداد التحقق الدوري
    setupPeriodicCheck() {
        // التحقق الدوري كل 5 دقائق
        this.authTimeout = setInterval(() => {
            console.log("⏰ التحقق الدوري من المصادقة...");
            this.checkAuthStatus();
        }, this.checkInterval);
    }

    // تحديث واجهة المستخدم
    updateUI(user) {
        // تحديث اسم المستخدم في الصفحة
        const userNameElements = document.querySelectorAll('.user-name-display, .current-user-name, .header-user-name');
        userNameElements.forEach(element => {
            element.textContent = user.displayName || 'مستخدم';
        });

        // تحديث البريد الإلكتروني
        const emailElements = document.querySelectorAll('.user-email-display, .header-user-email');
        emailElements.forEach(element => {
            element.textContent = user.email;
        });

        // إظهار المحتوى المحمي
        this.showProtectedContent();
    }

    // إظهار المحتوى المحمي
    showProtectedContent() {
        const protectedElements = document.querySelectorAll('.protected-content, [data-protected="true"]');
        protectedElements.forEach(element => {
            element.style.display = '';
        });
        
        // إخفاء رسالة تسجيل الدخول إذا كانت موجودة
        const loginMessage = document.getElementById('login-required-message');
        if (loginMessage) {
            loginMessage.style.display = 'none';
        }
    }

    // إضافة زر تسجيل الخروج
    addLogoutButton() {
        // إذا كان هناك زر تسجيل خروج موجود بالفعل، لا تضيف جديداً
        if (document.getElementById('page-logout-btn')) return;

        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'page-logout-btn';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> تسجيل الخروج';
        logoutBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 25px;
            background: linear-gradient(145deg, #ff6b6b, #ff5252);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-family: 'Cairo', sans-serif;
            font-weight: 600;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        logoutBtn.addEventListener('mouseover', () => {
            logoutBtn.style.transform = 'translateY(-2px)';
            logoutBtn.style.boxShadow = '0 6px 15px rgba(0,0,0,0.4)';
        });
        
        logoutBtn.addEventListener('mouseout', () => {
            logoutBtn.style.transform = 'translateY(0)';
            logoutBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        });
        
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('هل تريد تسجيل الخروج من حسابك؟')) {
                this.logout();
            }
        });
        
        document.body.appendChild(logoutBtn);
    }

    // تسجيل الخروج
    logout() {
        console.log("🚪 جاري تسجيل الخروج...");
        
        // مسح بيانات المصادقة
        this.clearAuthData();
        
        // إرسال إشارة لجميع النوافذ بتسجيل الخروج
        localStorage.setItem('alfajr_auth_status', 'logout');
        
        // إزالة زر تسجيل الخروج
        const logoutBtn = document.getElementById('page-logout-btn');
        if (logoutBtn) logoutBtn.remove();
        
        // عرض رسالة تسجيل الخروج
        this.showLogoutMessage();
        
        // إعادة التوجيه بعد تأخير
        setTimeout(() => {
            this.redirectToLogin();
        }, this.redirectDelay);
    }

    // مسح بيانات المصادقة
    clearAuthData() {
        localStorage.removeItem('alfajr_user');
        localStorage.removeItem('alfajr_session_expiry');
        localStorage.removeItem('alfajr_auth_status');
        
        // إرسال حدث لتسجيل الخروج
        window.dispatchEvent(new Event('alfajr_logout'));
    }

    // إلغاء المهلة الدورية
    clearAuthTimeout() {
        if (this.authTimeout) {
            clearInterval(this.authTimeout);
            this.authTimeout = null;
        }
    }

    // عرض رسالة تسجيل الخروج
    showLogoutMessage() {
        // إذا كانت الرسالة موجودة بالفعل، لا تعرضها مرة أخرى
        if (document.getElementById('logout-message')) return;
        
        const message = document.createElement('div');
        message.id = 'logout-message';
        message.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.95);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-family: 'Cairo', sans-serif;
            text-align: center;
            padding: 20px;
        `;
        
        message.innerHTML = `
            <div style="margin-bottom: 30px;">
                <i class="fas fa-sign-out-alt" style="font-size: 4rem; color: #ff6b6b; margin-bottom: 20px;"></i>
                <h2 style="font-size: 2rem; margin-bottom: 10px; color: #ff6b6b;">تم تسجيل الخروج</h2>
                <p style="font-size: 1.2rem; margin-bottom: 30px;">جاري إعادة التوجيه إلى صفحة تسجيل الدخول...</p>
                <div class="spinner" style="width: 50px; height: 50px; border: 5px solid #333; border-top: 5px solid #ff6b6b; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </div>
        `;
        
        // إضافة أنيميشن للدوران
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(message);
    }

    // إعادة التوجيه إلى صفحة تسجيل الدخول
    redirectToLogin() {
        console.log("🔀 إعادة التوجيه إلى صفحة تسجيل الدخول...");
        
        // إخفاء المحتوى المحمي
        this.hideProtectedContent();
        
        // عرض رسالة تسجيل الدخول المطلوب
        this.showLoginRequiredMessage();
        
        // إعادة التوجيه بعد تأخير
        setTimeout(() => {
            window.location.href = 'index.html';
        }, this.redirectDelay);
    }

    // إخفاء المحتوى المحمي
    hideProtectedContent() {
        const protectedElements = document.querySelectorAll('.protected-content, [data-protected="true"]');
        protectedElements.forEach(element => {
            element.style.display = 'none';
        });
    }

    // عرض رسالة تسجيل الدخول المطلوب
    showLoginRequiredMessage() {
        // إذا كانت الرسالة موجودة بالفعل، لا تعرضها مرة أخرى
        if (document.getElementById('login-required-message')) return;
        
        const message = document.createElement('div');
        message.id = 'login-required-message';
        message.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #0a0a0a 0%, #141414 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9998;
            color: white;
            font-family: 'Cairo', sans-serif;
            text-align: center;
            padding: 20px;
        `;
        
        message.innerHTML = `
            <div style="background: rgba(26, 26, 26, 0.9); padding: 40px; border-radius: 20px; max-width: 500px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <i class="fas fa-lock" style="font-size: 4rem; color: #9c7d54; margin-bottom: 20px;"></i>
                <h2 style="font-size: 2rem; margin-bottom: 15px; color: #9c7d54;">الدخول مطلوب</h2>
                <p style="font-size: 1.2rem; margin-bottom: 20px; line-height: 1.6;">
                    يرجى تسجيل الدخول للوصول إلى هذه الصفحة.
                    <br>
                    جاري إعادة توجيهك إلى صفحة تسجيل الدخول...
                </p>
                <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 30px;">
                    <button onclick="window.location.href='index.html'" style="padding: 15px 30px; background: linear-gradient(145deg, #9c7d54, #b89a70); color: white; border: none; border-radius: 12px; font-family: 'Cairo'; font-size: 1.1rem; cursor: pointer; transition: all 0.3s ease;">
                        <i class="fas fa-sign-in-alt"></i> الانتقال إلى تسجيل الدخول
                    </button>
                    <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #333; border-top: 4px solid #9c7d54; border-radius: 50%; margin: 20px auto; animation: spin 1s linear infinite;"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(message);
    }
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 تم تحميل الصفحة، بدء نظام التحقق...");
    window.authChecker = new AuthChecker();
});

// تصدير الفئة للاستخدام في الملفات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthChecker;
}