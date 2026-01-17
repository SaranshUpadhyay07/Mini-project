"use client";

import { useState } from "react";
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

export function NavbarDemo() {
  const navItems = [
    { name: "Home", link: "#home" },
    { name: "About", link: "#about" },
    { name: "Family Tracker", link: "#family" },
    { name: "Itinerary AI", link: "#ai" },
  ];

  const actions = [
    { icon: <HomeIcon />, name: "Home", link: "#home" },
    { icon: <InfoIcon />, name: "About", link: "#about" },
    { icon: <GroupIcon />, name: "Family Tracker", link: "#family" },
    { icon: <AutoAwesomeIcon />, name: "Itinerary AI", link: "#ai" },
  ];

  return (
    <>
      {/* ================= Desktop Navbar ================= */}
        <Navbar className="hidden lg:flex">
          <NavBody className="bg-[#f4622d] px-6 py-4 shadow-md">
            <NavbarLogo />
            <NavItems items={navItems} />
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
              onClick={() => {
                document.querySelector(action.link)?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            />
          ))}
        </SpeedDial>
      </Box>
    </>
  );
}
