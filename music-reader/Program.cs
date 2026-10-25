using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using Windows.Media.Control;

var source = args.FirstOrDefault()?.ToLowerInvariant() ?? "auto";
try {
    var manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
    var sessions = manager.GetSessions().AsEnumerable();
    if (source == "spotify") sessions = sessions.Where(s => s.SourceAppUserModelId.Contains("spotify", StringComparison.OrdinalIgnoreCase));
    if (source == "other") sessions = sessions.Where(s => !s.SourceAppUserModelId.Contains("spotify", StringComparison.OrdinalIgnoreCase));
    var session = source == "auto" ? manager.GetCurrentSession() : sessions.FirstOrDefault();
    if (session is null) { Console.WriteLine("{\"available\":false}"); return; }
    var media = await session.TryGetMediaPropertiesAsync();
    var timeline = session.GetTimelineProperties();
    var playback = session.GetPlaybackInfo();
    string? cover = null;
    if (media.Thumbnail is not null) {
        using var random = await media.Thumbnail.OpenReadAsync();
        await using var stream = random.AsStreamForRead();
        using var bytes = new MemoryStream(); await stream.CopyToAsync(bytes);
        cover = $"data:{random.ContentType};base64,{Convert.ToBase64String(bytes.ToArray())}";
    }
    Console.WriteLine(JsonSerializer.Serialize(new { available = true, title = string.IsNullOrWhiteSpace(media.Title) ? "Unknown track" : media.Title, artist = string.IsNullOrWhiteSpace(media.Artist) ? media.AlbumArtist : media.Artist, app = session.SourceAppUserModelId, status = playback.PlaybackStatus.ToString(), position = Math.Round(timeline.Position.TotalSeconds, 2), duration = Math.Round(timeline.EndTime.TotalSeconds, 2), cover }));
} catch (Exception error) { Console.WriteLine(JsonSerializer.Serialize(new { available = false, error = error.Message })); }
