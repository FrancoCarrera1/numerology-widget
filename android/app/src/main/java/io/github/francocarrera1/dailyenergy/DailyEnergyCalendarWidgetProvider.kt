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
 * A home-screen widget that renders five rolling days of daily energies.
 *
 * Five columns leave each cell wide enough for a legible weekday, date, and both
 * energies; seven columns could not. The calendar is drawn to a bitmap so the
 * strip stays sharp without inflating dozens of RemoteViews. The arrows move the
 * window by five days; tapping the range label returns to today. Tapping the
 * card opens the app; the refresh glyph redraws it.
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

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)
        appWidgetIds.forEach { clearAnchor(context, it) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val manager = AppWidgetManager.getInstance(context)

        when (intent.action) {
            ACTION_REFRESH_CALENDAR -> {
                val ids = manager.getAppWidgetIds(
                    ComponentName(context, DailyEnergyCalendarWidgetProvider::class.java)
                )
                ids.forEach { updateWidget(context, manager, it) }
                scheduleMidnightUpdate(context)
            }

            ACTION_PREV_SPAN,
            ACTION_NEXT_SPAN,
            ACTION_TODAY -> {
                val widgetId = intent.getIntExtra(
                    EXTRA_WIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID
                )
                if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return

                if (intent.action == ACTION_TODAY) {
                    clearAnchor(context, widgetId)
                } else {
                    val current = getAnchor(context, widgetId) ?: LocalDate.now()
                    val target = if (intent.action == ACTION_PREV_SPAN) {
                        current.minusDays(CalendarSpanBuilder.LENGTH.toLong())
                    } else {
                        current.plusDays(CalendarSpanBuilder.LENGTH.toLong())
                    }
                    setAnchor(context, widgetId, target)
                }

                updateWidget(context, manager, widgetId)
            }
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
        private const val ACTION_PREV_SPAN = "io.github.francocarrera1.dailyenergy.ACTION_PREV_SPAN"
        private const val ACTION_NEXT_SPAN = "io.github.francocarrera1.dailyenergy.ACTION_NEXT_SPAN"
        private const val ACTION_TODAY = "io.github.francocarrera1.dailyenergy.ACTION_TODAY"
        private const val EXTRA_WIDGET_ID = "widget_id"
        private const val PREFS_NAME = "daily_energy_calendar_widget"
        private const val ANCHOR_KEY_PREFIX = "anchor_"
        private const val REFRESH_REQUEST_CODE = 43
        private const val OPEN_APP_REQUEST_CODE = 44
        private const val SPAN_REQUEST_BASE = 1000

        private val WEEKDAYS = listOf("SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT")
        private val DATE_FORMAT = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy", Locale.US)

        private fun preferences(context: Context) =
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        private fun anchorKey(widgetId: Int) = "$ANCHOR_KEY_PREFIX$widgetId"

        private fun getAnchor(context: Context, widgetId: Int): LocalDate? {
            val value = preferences(context).getString(anchorKey(widgetId), null) ?: return null
            return try {
                LocalDate.parse(value)
            } catch (_: Exception) {
                null
            }
        }

        private fun setAnchor(context: Context, widgetId: Int, start: LocalDate) {
            val editor = preferences(context).edit()
            if (start == LocalDate.now()) {
                editor.remove(anchorKey(widgetId))
            } else {
                editor.putString(anchorKey(widgetId), start.toString())
            }
            editor.apply()
        }

        private fun clearAnchor(context: Context, widgetId: Int) {
            preferences(context).edit().remove(anchorKey(widgetId)).apply()
        }

        private fun spanIntent(
            context: Context,
            widgetId: Int,
            action: String
        ): PendingIntent {
            val intent = Intent(context, DailyEnergyCalendarWidgetProvider::class.java).apply {
                this.action = action
                putExtra(EXTRA_WIDGET_ID, widgetId)
            }
            val offset = when (action) {
                ACTION_PREV_SPAN -> 0
                ACTION_NEXT_SPAN -> 1
                else -> 2
            }
            return PendingIntent.getBroadcast(
                context,
                SPAN_REQUEST_BASE + widgetId * 3 + offset,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

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
            val selectedStart = getAnchor(context, widgetId) ?: today
            val span = CalendarSpanBuilder.build(selectedStart)
            val birthdayDate = BirthdayStore.getDate(context)
            val birthday = birthdayDate?.let { Birthday(it.monthValue, it.dayOfMonth) }
            val cycles = Cycles.calculateCycleEnergies(today, birthday)
            val lifePath = birthdayDate?.let { LifePath.calculate(it) }
            val views = RemoteViews(context.packageName, R.layout.widget_calendar)

            views.setTextViewText(R.id.calendar_range_label, span.label)
            views.setContentDescription(
                R.id.calendar_range_label,
                "${CalendarSpanBuilder.spokenLabel(span.start)}. " +
                    context.getString(R.string.calendar_week_hint)
            )
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
            val summary = "Energy calendar for ${CalendarSpanBuilder.spokenLabel(span.start)}. " +
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
                renderCalendar(context, span, today, widthDp, heightDp)
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
            views.setOnClickPendingIntent(
                R.id.calendar_prev,
                spanIntent(context, widgetId, ACTION_PREV_SPAN)
            )
            views.setOnClickPendingIntent(
                R.id.calendar_next,
                spanIntent(context, widgetId, ACTION_NEXT_SPAN)
            )
            views.setOnClickPendingIntent(
                R.id.calendar_range_label,
                spanIntent(context, widgetId, ACTION_TODAY)
            )

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
            span: CalendarSpan,
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
                paper = context.getColor(R.color.paper),
                cellFill = withAlpha(gold, 10),
                todayFill = withAlpha(gold, 40)
            )

            drawCalendar(
                canvas = Canvas(bitmap),
                width = widthPx,
                height = heightPx,
                span = span,
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
            span: CalendarSpan,
            today: LocalDate,
            density: Float,
            palette: Palette
        ) {
            val paint = Paint(Paint.ANTI_ALIAS_FLAG)
            val sidePad = 2f * density
            val footerHeight = 9f * density
            val footerGap = 3f * density
            val columns = span.days.size.coerceAtLeast(1)
            val colWidth = (width - sidePad * 2f) / columns
            val cellGap = 2f * density

            // Five columns of roughly 60dp: wide enough for a stacked weekday,
            // date and both energies. Cap the height so cells stay squarish and
            // centre the strip in the space the month grid used to fill.
            val gridTop = sidePad
            val gridBottom = height - sidePad - footerHeight - footerGap
            val gridHeight = (gridBottom - gridTop).coerceAtLeast(1f)
            val cellHeight = min(colWidth * 1.25f, gridHeight)
            val rowTop = gridTop + (gridHeight - cellHeight) / 2f
            val corner = 6f * density

            for ((colIndex, cell) in span.days.withIndex()) {
                val date = cell.date ?: continue
                val values = cell.energies ?: continue

                val left = sidePad + colIndex * colWidth
                val right = left + colWidth
                val cellRect = RectF(
                    left + cellGap / 2f,
                    rowTop,
                    right - cellGap / 2f,
                    rowTop + cellHeight
                )
                val isToday = date == today

                paint.style = Paint.Style.FILL
                paint.color = if (isToday) palette.todayFill else palette.cellFill
                canvas.drawRoundRect(cellRect, corner, corner, paint)

                if (isToday) {
                    paint.style = Paint.Style.STROKE
                    paint.strokeWidth = 1.2f * density
                    paint.color = palette.gold
                    canvas.drawRoundRect(cellRect, corner, corner, paint)
                }

                val centerX = (left + right) / 2f
                val availableWidth = colWidth - 4f * density

                val weekdaySize = min(8.5f * density, cellHeight * 0.16f)
                    .coerceAtLeast(6.5f * density)
                val dateSize = min(12f * density, cellHeight * 0.22f)
                    .coerceAtLeast(8.5f * density)
                val primarySize = min(17f * density, cellHeight * 0.31f)
                    .coerceAtLeast(10f * density)
                val secondarySize = min(13f * density, cellHeight * 0.23f)
                    .coerceAtLeast(8f * density)

                paint.style = Paint.Style.FILL
                paint.textAlign = Paint.Align.CENTER

                paint.typeface = Typeface.create(Typeface.SERIF, Typeface.NORMAL)
                paint.textSize = weekdaySize
                paint.color = if (isToday) palette.goldLight else palette.muted
                canvas.drawText(
                    WEEKDAYS[date.dayOfWeek.value % 7],
                    centerX,
                    rowTop + cellHeight * 0.19f,
                    paint
                )

                paint.typeface = Typeface.MONOSPACE
                paint.textSize = dateSize
                paint.color = if (isToday) palette.goldLight else palette.paper
                canvas.drawText(
                    cell.dayNumber.toString(),
                    centerX,
                    rowTop + cellHeight * 0.40f,
                    paint
                )

                paint.textSize = primarySize
                paint.color = palette.gold
                drawFittedTextCenter(
                    canvas,
                    values.fullDateEnergy.displayValue,
                    centerX,
                    rowTop + cellHeight * 0.68f,
                    availableWidth,
                    paint
                )

                paint.textSize = secondarySize
                paint.color = palette.bronze
                drawFittedTextCenter(
                    canvas,
                    values.secondaryEnergy.displayValue,
                    centerX,
                    rowTop + cellHeight * 0.92f,
                    availableWidth,
                    paint
                )
            }

            paint.style = Paint.Style.FILL
            paint.typeface = Typeface.create(Typeface.SERIF, Typeface.NORMAL)
            paint.textAlign = Paint.Align.RIGHT
            paint.textSize = 6.5f * density
            paint.color = palette.muted
            paint.textScaleX = 1f
            canvas.drawText("GG33", width - sidePad, height - sidePad, paint)
        }

        /** Centred fitted text: shrinks horizontally rather than overflowing. */
        private fun drawFittedTextCenter(
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
            val paper: Int,
            val cellFill: Int,
            val todayFill: Int
        )
    }
}
