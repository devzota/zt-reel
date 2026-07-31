
<RULE[ui_design_system]>
## UI Design System & Styling Rules

1. **Colors**: STRICTLY use default Tailwind CSS colors (slate, gray, emerald, red, blue, amber). DO NOT use custom Material colors or generate custom hex codes in Tailwind config except for primary (#1877f2), secondary (#4b5563), tertiary (#0a7ea4).
2. **Cards (Glass Card)**: Use the .glass-card class defined in index.css (g-white rounded-2xl shadow-md border border-slate-200/60). DO NOT use heavy gray borders (order-gray-300) to separate card components.
3. **Buttons**: 
   - Text buttons: MUST use ounded-full (pill shape).
   - Icon-only buttons: MUST be perfectly circular (w-10 h-10 rounded-full flex items-center justify-center p-0).
   - Cancel/Secondary buttons: MUST use light red background with red text (g-red-50 text-red-600 hover:bg-red-100).
4. **Inputs & Selects**: MUST use ounded-full bg-gray-100 border-2 border-transparent focus:outline-none focus:ring-0 focus:border-primary. (In index.css, input elements globally have outline: none;).
5. **Backgrounds**: Body uses g-slate-100 to create contrast for the white glass-card elements.
6. **Shadows**: Rely on shadow-sm, shadow-md, and shadow-lg to create depth instead of explicit borders.
</RULE[ui_design_system]>

