using System.Net;

namespace SWGROI_Server.Utils
{
    public static class Http
    {
        public static void SetHeaders(HttpListenerResponse res, string contentType = null, bool noCache = false)
        {
            if (res == null) return;

            if (noCache)
            {
                res.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
                res.Headers["Pragma"] = "no-cache";
                res.Headers["Expires"] = "0";
            }

            if (!string.IsNullOrEmpty(contentType))
            {
                res.ContentType = contentType;
            }
        }
    }
}

