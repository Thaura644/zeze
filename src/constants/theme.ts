/**
 * ZEZE Design System Constants
 * Following production-level standards for a premium dark-mode experience.
 */

export const COLORS = {
    primary: '#FF6B6B',      // Coral Red (Energetic)
    primaryDark: '#EE5253',
    primaryLight: '#FF8A8A',
    primaryLight20: '#FF8A8A33',
    secondary: '#4ECDC4',    // Turquoise (Fresh)
    secondaryLight: '#6EE7D7',
    secondaryLight20: '#6EE7D733',
    accent: '#FFE66D',       // Sun Yellow (Highlights)
    warning: '#FFA726',

    background: '#121212',   // Deep Black
    surface: '#1E1E1E',      // Elevation 1
    surfaceLight: '#2D2D2D', // Elevation 2
    surfaceDark: '#161616',   // Lower elevation

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
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
};

export const TYPOGRAPHY = {
    h1: {
        fontSize: 40,
        fontWeight: 'bold',
        letterSpacing: -1,
    },
    h2: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    h3: {
        fontSize: 20,
        fontWeight: '600',
    },
    body: {
        fontSize: 16,
        lineHeight: 24,
    },
    caption: {
        fontSize: 14,
    },
    captionSmall: {
        fontSize: 12,
    },
    button: {
        fontSize: 16,
        fontWeight: 'bold',
    },
};
