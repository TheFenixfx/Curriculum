document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('background-effect');
    const ctx = canvas.getContext('2d');

    if (!canvas || !ctx) {
        console.error("Canvas element or context not found!");
        return; // Stop further execution if canvas or context is null
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- Your drawing code goes here ---
    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
    ctx.fillRect(100, 100, 200, 100);

    // Example: Resize canvas on window resize (if needed)
    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Redraw your content here after resize
        ctx.fillStyle = 'rgba(0, 0, 255, 0.2)'; // Example redraw
        ctx.fillRect(100, 100, 200, 100);       // Example redraw
    });
});
