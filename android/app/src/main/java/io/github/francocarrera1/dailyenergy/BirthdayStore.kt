package io.github.francocarrera1.dailyenergy

import android.content.Context
import java.time.LocalDate

/**
 * Stores the full birth date. Personal Year/Month use only the month and day;
 * Life Path uses the whole date, including the birth year.
 */
object BirthdayStore {

    private const val PREFS_NAME = "daily_energy_prefs"
    private const val KEY_BIRTHDAY = "birthday"

    fun getDate(context: Context): LocalDate? {
        val stored = getRaw(context) ?: return null
        return runCatching { LocalDate.parse(stored) }.getOrNull()
    }

    fun getRaw(context: Context): String? {
        return prefs(context).getString(KEY_BIRTHDAY, null)
    }

    fun set(context: Context, date: LocalDate) {
        prefs(context).edit().putString(KEY_BIRTHDAY, date.toString()).apply()
    }

    fun clear(context: Context) {
        prefs(context).edit().remove(KEY_BIRTHDAY).apply()
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
