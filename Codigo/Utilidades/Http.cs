using System.Net;

namespace SWGROI_Server.Utils
{
    public static class Http
    {
        public static void NoStore(HttpListenerResponse res)
        {
            if (res == null) return;
            res.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
            res.Headers["Pragma"] = "no-cache";
            res.Headers["Expires"] = "0";
        }

        public static void JsonNoStore(HttpListenerResponse res)
        {
            NoStore(res);
            res.ContentType = "application/json; charset=utf-8";
        }
    }
}

