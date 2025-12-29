# Install Doctrine DBAL and dependencies
$baseUrl = "https://github.com"
$packages = @(
    @{ name="doctrine/dbal"; version="3.6.5"; dir="doctrine\dbal" },
    @{ name="doctrine/cache"; version="2.2.0"; dir="doctrine\cache" },
    @{ name="doctrine/deprecations"; version="1.0.0"; dir="doctrine\deprecations" },
    @{ name="doctrine/event-manager"; version="2.0.0"; dir="doctrine\event-manager" },
    @{ name="php-fig/cache"; version="3.0.0"; dir="psr\cache" },
    @{ name="php-fig/log"; version="3.0.0"; dir="psr\log" }
)

cd "c:\xampp\htdocs\610c\vendor"

foreach ($pkg in $packages) {
    $pkgParts = $pkg.name -split '/'
    $owner = $pkgParts[0]
    $repo = $pkgParts[1]
    $version = $pkg.version
    $dir = $pkg.dir
    
    $url = "$baseUrl/$owner/$repo/archive/refs/tags/$version.zip"
    $zipFile = "$repo-$version.zip"
    $extractDir = "$repo-$version"
    
    Write-Host "Downloading $($pkg.name)@$version..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $zipFile -ErrorAction Stop
        Write-Host "Extracting..."
        Expand-Archive $zipFile -DestinationPath . -ErrorAction Stop
        
        $parentDir = Split-Path -Parent $dir
        if (-not (Test-Path $parentDir)) {
            New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
        }
        
        if (Test-Path $extractDir) {
            if (Test-Path $dir) {
                Remove-Item $dir -Recurse -Force
            }
            Move-Item $extractDir $dir -Force
        }
        
        Remove-Item $zipFile -Force
        Write-Host "OK: $($pkg.name)"
    } catch {
        Write-Host "FAIL: $($pkg.name) - $_"
    }
}

Write-Host "`nDone!"

