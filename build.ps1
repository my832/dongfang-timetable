param(
    [Parameter(Mandatory=$true)][string]$Sdk,
    [string]$JavaHome = 'C:/Program Files/Android/Android Studio/jbr',
    [string]$Destination = "$PSScriptRoot/release/dongfang-timetable-local.apk",
    [string]$Keystore = "$PSScriptRoot/local-signing.jks"
)
$ErrorActionPreference = 'Stop'
$app = Join-Path $PSScriptRoot 'app'
$build = Join-Path $PSScriptRoot 'build'
$tools = Get-ChildItem -LiteralPath $Sdk -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'aapt2.exe') } | Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName
$platform = Get-ChildItem -LiteralPath $Sdk -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'android.jar') } | Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName
if (!$tools -or !$platform) { throw 'Android SDK Platform and Build Tools are required.' }
$env:JAVA_HOME = $JavaHome
$env:PATH = "$JavaHome/bin;$env:PATH"
New-Item -ItemType Directory -Force -Path "$build/classes", "$build/dex" | Out-Null
function Check-Exit { if ($LASTEXITCODE -ne 0) { throw "Build command failed: $LASTEXITCODE" } }
& "$tools/aapt2.exe" compile --dir "$app/res" -o "$build/resources.zip"; Check-Exit
& "$tools/aapt2.exe" link -o "$build/base.apk" -I "$platform/android.jar" --manifest "$app/AndroidManifest.xml" -A "$app/assets" -R "$build/resources.zip" --auto-add-overlay; Check-Exit
$sources = (Get-ChildItem -LiteralPath "$app/src/com/shiji/notes" -Filter '*.java').FullName
& "$JavaHome/bin/javac.exe" -encoding UTF-8 --release 8 -classpath "$platform/android.jar" -d "$build/classes" $sources; Check-Exit
& "$JavaHome/bin/jar.exe" cf "$build/classes.jar" -C "$build/classes" .; Check-Exit
& "$JavaHome/bin/java.exe" -cp "$tools/lib/d8.jar" com.android.tools.r8.D8 --release --min-api 26 --lib "$platform/android.jar" --output "$build/dex" "$build/classes.jar"; Check-Exit
& "$JavaHome/bin/jar.exe" uf "$build/base.apk" -C "$build/dex" classes.dex; Check-Exit
& "$tools/zipalign.exe" -p -f 4 "$build/base.apk" "$build/aligned.apk"; Check-Exit
if (!(Test-Path -LiteralPath $Keystore)) {
    $password = Read-Host 'Create a local APK signing password' -AsSecureString
    $plain = [Net.NetworkCredential]::new('', $password).Password
    & "$JavaHome/bin/keytool.exe" -genkeypair -keystore $Keystore -alias dongfang -storepass $plain -keypass $plain -dname 'CN=Dongfang Timetable, O=Local Build, C=CN' -keyalg RSA -keysize 3072 -validity 10000; Check-Exit
}
$secret = Read-Host 'Local APK signing password' -AsSecureString
$plain = [Net.NetworkCredential]::new('', $secret).Password
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
& "$JavaHome/bin/java.exe" -jar "$tools/lib/apksigner.jar" sign --v4-signing-enabled false --ks $Keystore --ks-key-alias dongfang --ks-pass "pass:$plain" --key-pass "pass:$plain" --out $Destination "$build/aligned.apk"; Check-Exit
& "$JavaHome/bin/java.exe" -jar "$tools/lib/apksigner.jar" verify --verbose $Destination; Check-Exit
Get-FileHash -LiteralPath $Destination -Algorithm SHA256
