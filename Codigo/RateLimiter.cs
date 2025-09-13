using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

namespace SWGROI_Server.Security
{
    // Rate limiter simple en memoria con ventana deslizante por clave (IP/usuario).
    public static class RateLimiter
    {
        private static readonly ConcurrentDictionary<string, List<DateTime>> _hits = new ConcurrentDictionary<string, List<DateTime>>();

        public static bool IsLimited(string key, int maxHits, TimeSpan window)
        {
            var now = DateTime.UtcNow;
            var list = _hits.GetOrAdd(key ?? "-", _ => new List<DateTime>());
            lock (list)
            {
                list.RemoveAll(t => (now - t) > window);
                if (list.Count >= maxHits) return true;
                list.Add(now);
                return false;
            }
        }
    }
}

