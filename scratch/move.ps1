mkdir frontend -Force
$items = @("src", "public", "node_modules", "dist", ".env", "index.html", "package.json", "package-lock.json", "postcss.config.js", "tailwind.config.js", "vite.config.js", "vercel.json")
foreach ($item in $items) {
  if (Test-Path $item) {
    Move-Item $item frontend/ -Force
  }
}
