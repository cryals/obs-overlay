param([ValidateSet('auto', 'spotify', 'other')][string]$Source = 'auto')

# Windows Global System Media Transport Controls is the same system surface used
# by the media flyout. It works with Spotify, browsers and other compatible apps.
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.ToString() -eq 'System.Threading.Tasks.Task`1[TResult] AsTask[TResult](Windows.Foundation.IAsyncOperation`1[TResult])'
})[0]

function Await-Operation($operation, [Type]$resultType) {
  $task = $asTaskGeneric.MakeGenericMethod($resultType).Invoke($null, @($operation))
  $task.Wait() | Out-Null
  return $task.Result
}

function Convert-Thumbnail($thumbnail) {
  if ($null -eq $thumbnail) { return $null }
  try {
    [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null
    $stream = Await-Operation ($thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime])
    if ($null -eq $stream) { return $null }
    $randomAccess = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]$stream
    $input = $randomAccess.GetInputStreamAt(0)
    $netStream = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($input)
    $bytes = New-Object byte[] $stream.Size
    [void]$netStream.Read($bytes, 0, $bytes.Length)
    $netStream.Dispose()
    return "data:$($stream.ContentType);base64,$([Convert]::ToBase64String($bytes))"
  } catch {
    return $null
  }
}

try {
  [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null
  $manager = Await-Operation ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime])
  $sessions = @($manager.GetSessions())
  if ($Source -eq 'spotify') { $sessions = @($sessions | Where-Object { $_.SourceAppUserModelId -match 'spotify' }) }
  if ($Source -eq 'other') { $sessions = @($sessions | Where-Object { $_.SourceAppUserModelId -notmatch 'spotify' }) }
  $session = if ($Source -eq 'auto') { $manager.GetCurrentSession() } else { $sessions | Select-Object -First 1 }
  if ($null -eq $session) { @{ available = $false } | ConvertTo-Json -Compress; exit 0 }

  [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media, ContentType = WindowsRuntime] | Out-Null
  $media = Await-Operation ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media, ContentType = WindowsRuntime])
  $timeline = $session.GetTimelineProperties()
  $playback = $session.GetPlaybackInfo()
  @{
    available = $true
    title = if ($media.Title) { $media.Title } else { 'Unknown track' }
    artist = if ($media.Artist) { $media.Artist } else { $media.AlbumArtist }
    app = $session.SourceAppUserModelId
    status = [string]$playback.PlaybackStatus
    position = [math]::Round($timeline.Position.TotalSeconds, 2)
    duration = [math]::Round($timeline.EndTime.TotalSeconds, 2)
    cover = Convert-Thumbnail $media.Thumbnail
  } | ConvertTo-Json -Compress -Depth 3
} catch {
  @{ available = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
}
