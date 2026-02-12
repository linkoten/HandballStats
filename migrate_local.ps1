# Script simplifie pour appliquer la migration
$env:PGPASSWORD = "naruto756"

# Chercher psql.exe
$pgPath = "C:\Program Files\PostgreSQL"
$psqlExe = $null

if (Test-Path $pgPath) {
    $versions = Get-ChildItem $pgPath -Directory | Sort-Object Name -Descending
    foreach ($version in $versions) {
        $testPath = Join-Path $version.FullName "bin\psql.exe"
        if (Test-Path $testPath) {
            $psqlExe = $testPath
            break
        }
    }
}

if ($psqlExe) {
    Write-Host "PostgreSQL trouve: $psqlExe"
    Write-Host "Application de la migration..."
    
    $sql = @"
ALTER TABLE Joueurs ADD COLUMN IF NOT EXISTS poste_principal VARCHAR(50);
ALTER TABLE Joueurs ADD COLUMN IF NOT EXISTS postes_secondaires VARCHAR(50)[];
CREATE INDEX IF NOT EXISTS idx_joueurs_poste_principal ON Joueurs(poste_principal);
CREATE INDEX IF NOT EXISTS idx_joueurs_postes_secondaires ON Joueurs USING GIN(postes_secondaires);
"@
    
    $sql | & $psqlExe -U postgres -d Handball -h localhost -p 5432
    Write-Host "Migration appliquee sur la base locale"
}
else {
    Write-Host "PostgreSQL psql.exe introuvable."
    Write-Host "Executez manuellement ces commandes dans pgAdmin:"
    Write-Host "ALTER TABLE Joueurs ADD COLUMN IF NOT EXISTS poste_principal VARCHAR(50);"
    Write-Host "ALTER TABLE Joueurs ADD COLUMN IF NOT EXISTS postes_secondaires VARCHAR(50)[];"
}

Remove-Item Env:\PGPASSWORD
