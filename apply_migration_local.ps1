# Script pour appliquer la migration sur la base PostgreSQL locale
$env:PGPASSWORD = "naruto756"
$sqlContent = Get-Content "c:\Users\Francois\Desktop\ProjetHand\HandballApp\database\migrations\001_add_postes_to_joueurs.sql" -Raw

# Trouver l'installation PostgreSQL
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
    Write-Host "✓ PostgreSQL trouvé: $psqlExe"
    Write-Host "Connexion à la base locale..."
    $sqlContent | & $psqlExe -U postgres -d Handball -h localhost -p 5432
    Write-Host "`n✅ Migration appliquée sur la base locale"
}
else {
    Write-Host "❌ PostgreSQL psql.exe introuvable."
    Write-Host "Veuillez exécuter manuellement dans pgAdmin ou votre outil PostgreSQL:"
    Write-Host ""
    Write-Host 'ALTER TABLE Joueurs ADD COLUMN IF NOT EXISTS poste_principal VARCHAR(50);'
    Write-Host 'ALTER TABLE Joueurs ADD COLUMN IF NOT EXISTS postes_secondaires VARCHAR(50)[];'
    Write-Host ""
    Write-Host 'ALTER TABLE Joueurs ADD CONSTRAINT check_poste_principal CHECK (poste_principal IS NULL OR poste_principal IN (''Gardien'', ''Ailier'', ''Arrière'', ''Demi-Centre'', ''Pivot''));'
    Write-Host ""
    Write-Host 'CREATE INDEX IF NOT EXISTS idx_joueurs_poste_principal ON Joueurs(poste_principal);'
    Write-Host 'CREATE INDEX IF NOT EXISTS idx_joueurs_postes_secondaires ON Joueurs USING GIN(postes_secondaires);'
}

Remove-Item Env:\PGPASSWORD
