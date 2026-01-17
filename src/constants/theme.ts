/**
 * ZEZE Design System Constants
 * Following production-level standards for a premium dark-mode experience.
 */

export const COLORS = {
    primary: '#FF6B6B',      // Coral Red (Energetic)
    primaryDark: '#EE5253',
    secondary: '#4ECDC4',    // Turquoise (Fresh)
    accent: '#FFE66D',       // Sun Yellow (Highlights)

    background: '#121212',   // Deep Black
    surface: '#1E1E1E',      // Elevation 1
    surfaceLight: '#2D2D2D', // Elevation 2

    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textMuted: '#666666',

    error: '#FF5252',
    success: '#1DD1A1',

    overlay: 'rgba(0, 0, 0, 0.6)',
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const BORDER_RADIUS = {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    round: 999,
};

export const SHADOWS = {
    soft: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
};

export const TYPOGRAPHY = {
    h1: {
        fontSize: 40,
        fontWeight: 'bold' as const,
        letterSpacing: -1,
    },
    h2: {
        fontSize: 24,
        fontWeight: 'bold' as const,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600' as const,
    },
    body: {
        fontSize: 16,
        lineHeight: 24,
    },
    caption: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    button: {
        fontSize: 16,
        fontWeight: 'bold' as const,
    },
};
