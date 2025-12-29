 = @{}
 = Get-ChildItem database/migrations -Filter *.php | Sort-Object Name
foreach ( in ) {
     = Get-Content -Raw 
     = [regex]::Matches(, 'class\s+(\w+)')
     = foreach ( in ) { .Groups[1].Value }
    Write-Host .Name 
    foreach ( in ) {
        if (-not .ContainsKey()) { 
            [] = @()
        }
        [] += .Name
    }
}
 = False
foreach ( in .Keys) {
     = []
    if (.Count -gt 1) {
         =  -join 

        Write-Host  DUP 
         = True
    }
}
 = False
if () {
    exit 1
}
