package io.github.francocarrera1.dailyenergy

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Bundle
import android.widget.RemoteViews
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * A larger home-screen widget that renders the whole current month.
 *
 * The calendar is drawn to a bitmap so a 7-column grid stays readable without
 * inflating dozens of RemoteViews. Tapping the card opens the app; the refresh
 * glyph redraws it immediately.
 */
class DailyEnergyCalendarWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { widgetId ->
            updateWidget(context, appWidgetManager, widgetId)
        }
        scheduleMidnightUpdate(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        scheduleMidnightUpdate(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        cancelMidnightUpdate(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_REFRESH_CALENDAR) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, DailyEnergyCalendarWidgetProvider::class.java)
            )
            ids.forEach { updateWidget(context, manager, it) }
            scheduleMidnightUpdate(context)
        }
    }

    private fun scheduleMidnightUpdate(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val zone = ZoneId.systemDefault()
        val nextMidnight = LocalDate.now()
            .plusDays(1)
            .atStartOfDay(zone)
            .plusMinutes(1)
            .toInstant()
            .toEpochMilli()

        alarmManager.set(AlarmManager.RTC, nextMidnight, refreshIntent(context))
    }

    private fun cancelMidnightUpdate(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(refreshIntent(context))
    }

    private fun refreshIntent(context: Context): PendingIntent {
        val intent = Intent(context, DailyEnergyCalendarWidgetProvider::class.java).apply {
            action = ACTION_REFRESH_CALENDAR
        }
        return PendingIntent.getBroadcast(
            context,
            REFRESH_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    companion object {
        const val ACTION_REFRESH_CALENDAR = "io.github.francocarrera1.dailyenergy.ACTION_REFRESH_CALENDAR"
        private const val REFRESH_REQUEST_CODE = 43
        private const val OPEN_APP_REQUEST_CODE = 44

        private val WEEKDAYS = listOf("SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT")
        private val DATE_FORMAT = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy", Locale.US)

        fun updateAllWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, DailyEnergyCalendarWidgetProvider::class.java)
            )
            ids.forEach { updateWidget(context, manager, it) }
        }

        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            widgetId: Int
        ) {
            val today = LocalDate.now()
            val energies = Numerology.calculate(today)
            val month = CalendarMonthBuilder.build(today)
            val birthdayDate = BirthdayStore.getDate(context)
            val birthday = birthdayDate?.let { Birthday(it.monthValue, it.dayOfMonth) }
            val cycles = Cycles.calculateCycleEnergies(today, birthday)
            val lifePath = birthdayDate?.let { LifePath.calculate(it) }
            val views = RemoteViews(context.packageName, R.layout.widget_calendar)

            views.setTextViewText(R.id.calendar_month, month.label)
            views.setTextViewText(
                R.id.calendar_today_energy,
                "${energies.fullDateEnergy.displayValue} + ${energies.secondaryEnergy.displayValue}"
            )
            views.setTextViewText(
                R.id.calendar_life_path,
                "LP ${lifePath?.displayValue ?: "—"}"
            )
            views.setTextViewText(
                R.id.calendar_uy_value,
                cycles.universalYear.displayValue
            )
            views.setTextViewText(
                R.id.calendar_um_value,
                cycles.universalMonth.displayValue
            )
            views.setTextViewText(
                R.id.calendar_py_value,
                cycles.personalYear?.displayValue ?: "—"
            )
            views.setTextViewText(
                R.id.calendar_pm_value,
                cycles.personalMonth?.displayValue ?: "—"
            )

            val personalSummary = if (cycles.personalYear != null && cycles.personalMonth != null) {
                " Personal year ${cycles.personalYear.displayValue}, " +
                    "personal month ${cycles.personalMonth.displayValue}."
            } else {
                " Set a full birthday to show personal cycles."
            }
            val lifePathSummary = lifePath?.let {
                " Life path ${it.displayValue}, ${it.summary}."
            } ?: " Set a full birthday to show Life Path."
            val summary = "Energy calendar for ${month.label}. " +
                "Today, ${today.format(DATE_FORMAT)}: " +
                "primary ${energies.fullDateEnergy.displayValue}, " +
                "secondary ${energies.secondaryEnergy.displayValue}, " +
                "combined ${energies.combinedKey}." +
                lifePathSummary +
                " Universal year ${cycles.universalYear.displayValue}, " +
                "universal month ${cycles.universalMonth.displayValue}." +
                personalSummary
            views.setContentDescription(R.id.calendar_widget_root, summary)
            views.setContentDescription(R.id.calendar_image, summary)

            val options = appWidgetManager.getAppWidgetOptions(widgetId)
            val widthDp = optionDp(
                options,
                AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH,
                AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,
                250
            )
            val heightDp = optionDp(
                options,
                AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,
                AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,
                250
            )

            views.setImageViewBitmap(
                R.id.calendar_image,
                renderCalendar(context, month, today, widthDp, heightDp)
            )

            val refresh = Intent(context, DailyEnergyCalendarWidgetProvider::class.java).apply {
                action = ACTION_REFRESH_CALENDAR
            }
            val refreshPendingIntent = PendingIntent.getBroadcast(
                context,
                REFRESH_REQUEST_CODE,
                refresh,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.calendar_refresh, refreshPendingIntent)

            val openApp = Intent(context, MainActivity::class.java)
            val openAppPendingIntent = PendingIntent.getActivity(
                context,
                OPEN_APP_REQUEST_CODE,
                openApp,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.calendar_widget_root, openAppPendingIntent)

            appWidgetManager.updateAppWidget(widgetId, views)
        }

        private fun optionDp(
            options: Bundle,
            primaryKey: String,
            fallbackKey: String,
            default: Int
        ): Int {
            val primary = options.getInt(primaryKey, 0)
            if (primary > 0) return primary
            val fallback = options.getInt(fallbackKey, 0)
            return if (fallback > 0) fallback else default
        }

        private fun renderCalendar(
            context: Context,
            month: CalendarMonth,
            today: LocalDate,
            widthDp: Int,
            heightDp: Int
        ): Bitmap {
            val density = context.resources.displayMetrics.density

            // The layout uses 14dp padding on each side and roughly 92dp of
            // header/today/cycles rows above the weighted ImageView.
            val widthPx = (((widthDp - 28).coerceAtLeast(180)) * density)
                .roundToInt()
                .coerceIn(320, 1400)
            val heightPx = (((heightDp - 92).coerceAtLeast(120)) * density)
                .roundToInt()
                .coerceIn(220, 1200)

            val bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
            val gold = context.getColor(R.color.gold)
            val palette = Palette(
                gold = gold,
                goldLight = context.getColor(R.color.gold_light),
                bronze = context.getColor(R.color.bronze),
                muted = context.getColor(R.color.muted),
                cellFill = withAlpha(gold, 10),
                todayFill = withAlpha(gold, 40)
            )

            drawCalendar(
                canvas = Canvas(bitmap),
                width = widthPx,
                height = heightPx,
                month = month,
                today = today,
                density = density,
                palette = palette
            )

            return bitmap
        }

        private fun drawCalendar(
            canvas: Canvas,
            width: Int,
            height: Int,
            month: CalendarMonth,
            today: LocalDate,
            density: Float,
            palette: Palette
        ) {
            val paint = Paint(Paint.ANTI_ALIAS_FLAG)
            val sidePad = 1.5f * density
            val weekdayHeight = 11f * density
            val footerHeight = 8f * density
            val footerGap = 2f * density
            val gridTop = sidePad + weekdayHeight
            val gridBottom = height - sidePad - footerHeight - footerGap
            val gridHeight = (gridBottom - gridTop).coerceAtLeast(1f)
            val rowHeight = gridHeight / month.weeks.size
            val colWidth = (width - sidePad * 2f) / 7f

            // Weekday header
            paint.style = Paint.Style.FILL
            paint.typeface = Typeface.create(Typeface.SERIF, Typeface.NORMAL)
            paint.textAlign = Paint.Align.CENTER
            paint.textSize = 7f * density
            paint.color = palette.muted
            val weekdayBaseline = sidePad + weekdayHeight * 0.8f
            for (index in WEEKDAYS.indices) {
                canvas.drawText(
                    WEEKDAYS[index],
                    sidePad + colWidth * (index + 0.5f),
                    weekdayBaseline,
                    paint
                )
            }

            for ((rowIndex, week) in month.weeks.withIndex()) {
                val top = gridTop + rowIndex * rowHeight
                for ((colIndex, cell) in week.withIndex()) {
                    val date = cell.date ?: continue
                    val values = cell.energies ?: continue

                    val left = sidePad + colIndex * colWidth
                    val right = left + colWidth
                    val inset = 1.2f * density
                    val cellRect = RectF(
                        left + inset,
                        top + inset,
                        right - inset,
                        top + rowHeight - inset
                    )
                    val isToday = date == today
                    val corner = 4f * density

                    paint.style = Paint.Style.FILL
                    paint.color = if (isToday) palette.todayFill else palette.cellFill
                    canvas.drawRoundRect(cellRect, corner, corner, paint)

                    if (isToday) {
                        paint.style = Paint.Style.STROKE
                        paint.strokeWidth = 1f * density
                        paint.color = palette.gold
                        canvas.drawRoundRect(cellRect, corner, corner, paint)
                    }

                    val centerX = (left + right) / 2f
                    val availableWidth = colWidth - 4f * density

                    val daySize = min(7.5f * density, rowHeight * 0.22f)
                        .coerceAtLeast(5f * density)
                    val primarySize = min(10f * density, rowHeight * 0.31f)
                        .coerceAtLeast(6.5f * density)
                    val secondarySize = min(8.5f * density, rowHeight * 0.25f)
                        .coerceAtLeast(5.5f * density)

                    paint.style = Paint.Style.FILL
                    paint.typeface = Typeface.MONOSPACE
                    paint.textAlign = Paint.Align.CENTER

                    paint.textSize = daySize
                    paint.color = if (isToday) palette.goldLight else palette.muted
                    canvas.drawText(
                        cell.dayNumber.toString(),
                        centerX,
                        top + rowHeight * 0.30f,
                        paint
                    )

                    paint.textSize = primarySize
                    paint.color = palette.gold
                    drawFittedText(
                        canvas,
                        values.fullDateEnergy.displayValue,
                        centerX,
                        top + rowHeight * 0.62f,
                        availableWidth,
                        paint
                    )

                    paint.textSize = secondarySize
                    paint.color = palette.bronze
                    drawFittedText(
                        canvas,
                        values.secondaryEnergy.displayValue,
                        centerX,
                        top + rowHeight * 0.86f,
                        availableWidth,
                        paint
                    )
                }
            }

            paint.style = Paint.Style.FILL
            paint.typeface = Typeface.create(Typeface.SERIF, Typeface.NORMAL)
            paint.textAlign = Paint.Align.RIGHT
            paint.textSize = 6.5f * density
            paint.color = palette.muted
            paint.textScaleX = 1f
            canvas.drawText("GG33", width - sidePad, height - sidePad, paint)
        }

        private fun drawFittedText(
            canvas: Canvas,
            text: String,
            centerX: Float,
            baseline: Float,
            maxWidth: Float,
            paint: Paint
        ) {
            val originalScaleX = paint.textScaleX
            val measured = paint.measureText(text)
            if (measured > maxWidth && measured > 0f) {
                paint.textScaleX = maxWidth / measured
            }
            canvas.drawText(text, centerX, baseline, paint)
            paint.textScaleX = originalScaleX
        }

        private fun withAlpha(color: Int, alpha: Int): Int {
            return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color))
        }

        private data class Palette(
            val gold: Int,
            val goldLight: Int,
            val bronze: Int,
            val muted: Int,
            val cellFill: Int,
            val todayFill: Int
        )
    }
}
