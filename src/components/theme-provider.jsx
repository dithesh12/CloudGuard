"use client"

import * as React from "react"
import PropTypes from "prop-types"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
