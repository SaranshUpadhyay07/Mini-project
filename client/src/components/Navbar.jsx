"use client";

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Navbar,
  NavBody,
  NavItems,
  NavbarLogo,
  NavbarButton,
} from "../ui/resizable-navbar";

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

export function NavbarDemo() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMapPage = location.pathname === '/map';

  const navItems = [
    { name: "Home", link: isMapPage ? "/" : "#home", isRoute: isMapPage },
    { name: "Map", link: "/map", isRoute: true },
    { name: "About", link: "#about", isRoute: false },
    { name: "Family Tracker", link: "#family", isRoute: false },
    { name: "Itinerary AI", link: "#ai", isRoute: false },
  ];

  const actions = [
    { icon: <HomeIcon />, name: "Home", link: isMapPage ? "/" : "#home", isRoute: isMapPage },
    { icon: <MapIcon />, name: "Map", link: "/map", isRoute: true },
    { icon: <InfoIcon />, name: "About", link: "#about", isRoute: false },
    { icon: <GroupIcon />, name: "Family Tracker", link: "#family", isRoute: false },
    { icon: <AutoAwesomeIcon />, name: "Itinerary AI", link: "#ai", isRoute: false },
  ];

  const handleNavigation = (link, isRoute) => {
    if (isRoute) {
      navigate(link);
    } else {
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          document.querySelector(link)?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        document.querySelector(link)?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <>
      {/* ================= Desktop Navbar ================= */}
        <Navbar className="hidden lg:flex">
          <NavBody className="bg-[#f4622d] px-6 py-4 shadow-md">
            <NavbarLogo />
            <NavItems 
              items={navItems} 
              onItemClick={(e, item) => {
                e.preventDefault();
                handleNavigation(item.link, item.isRoute);
              }}
            />
            <div className="flex items-center gap-4">
              <NavbarButton variant="primary">Login / Sign Up</NavbarButton>
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
          {actions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={() => handleNavigation(action.link, action.isRoute)}
            />
          ))}
        </SpeedDial>
      </Box>
    </>
  );
}
