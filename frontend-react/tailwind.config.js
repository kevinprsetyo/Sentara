/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#059669', // emerald-600
                    hover: '#047857', // emerald-700
                },
                secondary: {
                    DEFAULT: '#0d9488', // teal-600
                },
                accent: {
                    DEFAULT: '#d97706', // amber-600
                },
            },
            fontFamily: {
                sans: ['Inter', 'Roboto', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
