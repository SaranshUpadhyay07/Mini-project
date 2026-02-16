"use client";

import { useNavigate, useLocation } from "react-router-dom";
import { useMemo } from "react";
import {
  Navbar,
  NavBody,
  NavItems,
  NavbarLogo,
} from "../ui/resizable-navbar";
import { useAuth } from "../context/AuthContext";

// MUI
import Box from "@mui/material/Box";
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialIcon from "@mui/material/SpeedDialIcon";
import SpeedDialAction from "@mui/material/SpeedDialAction";

import HomeIcon from "@mui/icons-material/Home";
import InfoIcon from "@mui/icons-material/Info";
import GroupIcon from "@mui/icons-material/Group";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import MapIcon from "@mui/icons-material/Map";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

export function NavbarDemo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const isHomePage = location.pathname === "/";
  const isProtectedPath = useMemo(() => {
    // Keep in sync with protected routes in App.jsx
    return ["/map", "/profile", "/itineraryai"].includes(location.pathname);
  }, [location.pathname]);

  const handleLogout = async () => {
    const result = await logout();
    // Only redirect to Sign In if the user is currently on a protected route.
    // Otherwise, keep them on the current public page.
    if (result?.success && isProtectedPath) navigate("/signin", { replace: true });
  };

  const scrollToSection = (id) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const setHash = (hash) => {
    if (!hash?.startsWith?.("#")) return;
    try {
      window.history.replaceState(null, "", hash);
    } catch {
      // ignore
    }
  };

  const handleNavigation = (link, isRoute) => {
    if (isRoute) {
      navigate(link);
      return;
    }

    if (!isHomePage) {
      navigate("/");
      setTimeout(() => {
        scrollToSection(link);
        setHash(link);
      }, 150);
    } else {
      scrollToSection(link);
      setHash(link);
    }
  };

  const activeLink = useMemo(() => {
    // Highlight section tabs using the current URL hash on home.
    if (location.pathname === "/" && location.hash) return location.hash;
    return null;
  }, [location.pathname, location.hash]);

  const navItems = [
    { name: "Home", link: "/", isRoute: true },
    { name: "Map", link: "/map", isRoute: true },
    { name: "About", link: "#about", isRoute: false },
    { name: "Family Tracker", link: "#family", isRoute: false },
    { name: "Itinerary AI", link: "/itineraryai", isRoute: true },
  ];

  const baseActions = [
    { icon: <HomeIcon />, name: "Home", link: "/", isRoute: true },
    { icon: <MapIcon />, name: "Map", link: "/map", isRoute: true },
    { icon: <InfoIcon />, name: "About", link: "#about", isRoute: false },
    { icon: <GroupIcon />, name: "Family Tracker", link: "#family", isRoute: false },
    { icon: <AutoAwesomeIcon />, name: "Itinerary AI", link: "/itineraryai", isRoute: true },
  ];

  const authActions = currentUser
    ? [
        { icon: <AccountCircleIcon />, name: "Profile", action: () => navigate("/profile") },
        { icon: <LogoutIcon />, name: "Logout", action: handleLogout },
      ]
    : [
        { icon: <LoginIcon />, name: "Sign In", action: () => navigate("/signin") },
        { icon: <LoginIcon />, name: "Sign Up", action: () => navigate("/signup") },
      ];

  return (
    <>
      {/* ================= Desktop Navbar ================= */}
      <Navbar className="hidden lg:flex">
        <NavBody className="bg-[#f4622d] px-6 py-0.5 shadow-md">
          <NavbarLogo />

          <NavItems
            items={navItems}
            activeLink={activeLink}
            onItemClick={(e, item) => {
              if (!item?.isRoute) {
                e.preventDefault?.();
                handleNavigation(item.link, false);
              }
            }}
          />

          <div className="flex gap-3">
            {currentUser ? (
              <>
                <button
                  onClick={() => navigate("/profile")}
                  className="px-3 py-2 border-2 border-white text-white rounded-xl"
                  aria-label="Profile"
                  title="Profile"
                >
                  <AccountCircleIcon fontSize="small" />
                </button>

                <button
                  onClick={handleLogout}
                  className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/signin")}
                  className="px-6 py-2 border-2 border-orange-600 text-orange-600 font-bold rounded-xl"
                >
                  Sign In
                </button>

                <button
                  onClick={() => navigate("/signup")}
                  className="px-6 py-2 bg-orange-600 text-white font-bold rounded-xl"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </NavBody>
      </Navbar>

      {/* ================= Mobile Speed Dial ================= */}
      <Box className="lg:hidden fixed bottom-4 right-4 z-[999]">
        <SpeedDial
          ariaLabel="Navigation Menu"
          icon={<SpeedDialIcon />}
          FabProps={{
            sx: {
              bgcolor: "#f4622d",
              color: "white",
              "&:hover": { bgcolor: "#fa4909ff" },
            },
          }}
        >
          {baseActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={() => handleNavigation(action.link, action.isRoute)}
            />
          ))}

          {authActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={action.action}
            />
          ))}
        </SpeedDial>
      </Box>
    </>
  );
}
