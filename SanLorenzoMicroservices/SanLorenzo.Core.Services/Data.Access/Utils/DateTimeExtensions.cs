using System;

namespace Data.Access.Utils
{
    public static class DateTimeExtensions
    {
        public static DateTime StartOfDay(this DateTime value)
        {
            return value.Date;
        }

        public static DateTime EndOfDay(this DateTime value)
        {
            return value.Date.AddDays(1).AddSeconds(-1);
        }

        public static DateTime? StartOfDayOrNull(this DateTime? value)
        {
            return value?.Date;
        }

        public static DateTime? EndOfDayOrNull(this DateTime? value)
        {
            return value.HasValue ? value.Value.Date.AddDays(1).AddSeconds(-1) : null;
        }
    }
}