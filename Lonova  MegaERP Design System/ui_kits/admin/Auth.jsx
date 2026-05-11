/* eslint-disable */
const LoginCard = ({ onLogin }) => {
  const [loading, setLoading] = React.useState(false);
  const submit = (e) => { e.preventDefault(); setLoading(true); setTimeout(() => { setLoading(false); onLogin?.(); }, 900); };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#06080f] px-6 relative overflow-hidden">
      <HeroGlow className="!w-[600px] !h-[400px]" />
      <Card className="w-full max-w-md shadow-2xl !border-indigo-500/10 relative">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <I.LogIn size={32} className="text-white" />
          </div>
          <CardTitle className="!text-3xl tracking-tight">Hoş Geldiniz</CardTitle>
          <p className="text-slate-400 text-sm mt-1">MegaERP ekosistemine giriş yapın</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Input label="E-posta" icon={<I.Mail size={20} />} type="email" placeholder="canayan@megaerp.com" defaultValue="canayan@megaerp.com" />
            <Input label="Şifre" hint="Şifremi Unuttum" icon={<I.Lock size={20} />} type="password" placeholder="••••••••" defaultValue="67890memo" />
            <Button type="submit" size="lg" className="w-full !py-3.5 !text-base mt-2" disabled={loading}>
              {loading ? <I.Loader size={20} className="animate-spin" /> : 'Giriş Yap'}
            </Button>
          </form>
          <div className="mt-8 text-center text-sm text-slate-500">
            Hesabınız yok mu? <a className="text-indigo-400 font-semibold hover:underline cursor-pointer">Kayıt Olun</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
Object.assign(window, { LoginCard });
