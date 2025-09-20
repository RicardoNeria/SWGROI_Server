using System.Net;
using System.Text;

namespace SWGROI_Server.Utils
{
    // Helpers pequeños para construir HTML con encodificación segura
    public static class Html
    {
        public static StringBuilder AppendCell(this StringBuilder sb, object value, string cssClass = null)
        {
            if (sb == null) sb = new StringBuilder();
            var v = value == null ? string.Empty : WebUtility.HtmlEncode(value.ToString());
            if (string.IsNullOrEmpty(cssClass)) sb.Append("<td>").Append(v).Append("</td>");
            else sb.Append("<td class='").Append(cssClass).Append("'>").Append(v).Append("</td>");
            return sb;
        }

        public static StringBuilder AppendCellRaw(this StringBuilder sb, string rawHtml, string cssClass = null)
        {
            if (sb == null) sb = new StringBuilder();
            if (string.IsNullOrEmpty(cssClass)) sb.Append("<td>").Append(rawHtml ?? string.Empty).Append("</td>");
            else sb.Append("<td class='").Append(cssClass).Append("'>").Append(rawHtml ?? string.Empty).Append("</td>");
            return sb;
        }

        public static StringBuilder AppendHeader(this StringBuilder sb, string text, string cssClass = null)
        {
            if (sb == null) sb = new StringBuilder();
            var t = text == null ? string.Empty : WebUtility.HtmlEncode(text);
            if (string.IsNullOrEmpty(cssClass)) sb.Append("<th>").Append(t).Append("</th>");
            else sb.Append("<th class='").Append(cssClass).Append("'>").Append(t).Append("</th>");
            return sb;
        }
    }
}
