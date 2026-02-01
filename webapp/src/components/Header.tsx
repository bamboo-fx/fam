import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/lib/auth-client";

interface HeaderProps {
  showBackButton?: boolean;
}

export function Header({ showBackButton = false }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session } = useSession();
  const isLandingPage = location.pathname === "/";

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate("/");
        },
      },
    });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/Generic-QUJA.png"
              alt="MatchMyTrial Logo"
              className="w-10 h-10 object-contain"
            />
            <span className="font-semibold text-lg">MatchMyTrial</span>
          </Link>

          <div className="flex items-center gap-3">
            {session?.user ? (
              isLandingPage ? (
                <Link to="/intake">
                  <Button size="sm">
                    Find Trials
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              )
            ) : (
              <Link to="/login">
                <Button size="sm">Get Started</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
