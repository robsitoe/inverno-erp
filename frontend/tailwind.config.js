/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./app/**/*.{html,ts,js,jsx,tsx}",
        "./src/**/*.{html,ts,js,jsx,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                primary: "#0A4DAA",
                secondary: "#00AB84",
                "footer-blue": "#0078D7",
                "bg-app": "#F0F0F0",
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"]
            }
        },
    },
    plugins: [],
}
