// tema.js — gestionare 3 teme (light/dark/forest) pe toate paginile
// Citeste preferinta din localStorage si aplica clasa pe <html>; asculta select-ul din header
(function () {
    var THEMES = ['light', 'dark', 'forest'];

    function applyTheme(theme) {
        THEMES.forEach(function(t) { document.documentElement.classList.remove(t + '-theme'); });
        if (theme === 'dark') document.documentElement.classList.add('dark-theme');
        else if (theme === 'forest') document.documentElement.classList.add('forest-theme');
        // 'light' = default, no extra class needed
        var sel = document.getElementById('theme-select-global');
        if (sel && sel.value !== theme) sel.value = theme;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var saved = localStorage.getItem('theme') || 'light';
        applyTheme(saved);

        var sel = document.getElementById('theme-select-global');
        if (sel) {
            sel.value = saved;
            sel.addEventListener('change', function () {
                applyTheme(sel.value);
                localStorage.setItem('theme', sel.value);
            });
        }
    });
})();
