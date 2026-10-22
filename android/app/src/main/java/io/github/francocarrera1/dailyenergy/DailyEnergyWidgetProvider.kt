package io.github.francocarrera1.dailyenergy

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

class DailyEnergyWidgetProvider : AppWidgetProvider() {

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

        if (intent.action == ACTION_REFRESH) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, DailyEnergyWidgetProvider::class.java)
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
        val intent = Intent(context, DailyEnergyWidgetProvider::class.java).apply {
            action = ACTION_REFRESH
        }
        return PendingIntent.getBroadcast(
            context,
            REFRESH_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    companion object {
        const val ACTION_REFRESH = "io.github.francocarrera1.dailyenergy.ACTION_REFRESH"
        private const val REFRESH_REQUEST_CODE = 41

        private val DATE_FORMAT = DateTimeFormatter.ofPattern("EEE, MMM d", Locale.US)

        fun updateAllWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, DailyEnergyWidgetProvider::class.java)
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
            val birthdayDate = BirthdayStore.getDate(context)
            val birthday = birthdayDate?.let { Birthday(it.monthValue, it.dayOfMonth) }
            val cycles = Cycles.calculateCycleEnergies(today, birthday)
            val lifePath = birthdayDate?.let { LifePath.calculate(it) }
            val views = RemoteViews(context.packageName, R.layout.widget_daily_energy)

            views.setTextViewText(R.id.widget_date, today.format(DATE_FORMAT))
            views.setTextViewText(
                R.id.widget_primary,
                energies.fullDateEnergy.displayValue
            )
            views.setTextViewText(
                R.id.widget_secondary,
                energies.secondaryEnergy.displayValue
            )
            views.setTextViewText(R.id.widget_combined, energies.combinedKey)

            val options = appWidgetManager.getAppWidgetOptions(widgetId)
            val heightDp = options.getInt(
                AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,
                0
            ).takeIf { it > 0 } ?: options.getInt(
                AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,
                0
            )

            val personalCycles = if (cycles.personalYear != null && cycles.personalMonth != null) {
                "  PY ${cycles.personalYear.displayValue}  PM ${cycles.personalMonth.displayValue}"
            } else {
                ""
            }
            val lifePathText = "LP ${lifePath?.displayValue ?: "—"}"
            val cyclesText = if (heightDp >= 180) {
                "$lifePathText  UY ${cycles.universalYear.displayValue}  " +
                    "UM ${cycles.universalMonth.displayValue}$personalCycles"
            } else {
                lifePathText
            }
            views.setTextViewText(R.id.widget_cycles, cyclesText)
            views.setViewVisibility(R.id.widget_cycles, View.VISIBLE)

            val personalSummary = if (cycles.personalYear != null && cycles.personalMonth != null) {
                " Personal year ${cycles.personalYear.displayValue}, " +
                    "personal month ${cycles.personalMonth.displayValue}."
            } else {
                ""
            }
            val lifePathSummary = lifePath?.let {
                " Life path ${it.displayValue}, ${it.summary}."
            } ?: " Set a full birthday to show Life Path."
            views.setContentDescription(
                R.id.widget_root,
                "Daily energy for ${today.format(DATE_FORMAT)}. " +
                    "Primary ${energies.fullDateEnergy.displayValue}, " +
                    "secondary ${energies.secondaryEnergy.displayValue}, " +
                    "combined ${energies.combinedKey}." +
                    lifePathSummary +
                    " Universal year ${cycles.universalYear.displayValue}, " +
                    "universal month ${cycles.universalMonth.displayValue}." +
                    personalSummary
            )

            val refresh = Intent(context, DailyEnergyWidgetProvider::class.java).apply {
                action = ACTION_REFRESH
            }
            val refreshPendingIntent = PendingIntent.getBroadcast(
                context,
                REFRESH_REQUEST_CODE,
                refresh,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_refresh, refreshPendingIntent)

            val openApp = Intent(context, MainActivity::class.java)
            val openAppPendingIntent = PendingIntent.getActivity(
                context,
                OPEN_APP_REQUEST_CODE,
                openApp,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, openAppPendingIntent)

            appWidgetManager.updateAppWidget(widgetId, views)
        }

        private const val OPEN_APP_REQUEST_CODE = 42
    }
}
