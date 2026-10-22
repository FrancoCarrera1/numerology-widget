package io.github.francocarrera1.dailyenergy

import android.app.Activity
import android.app.DatePickerDialog
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

class MainActivity : Activity() {

    private lateinit var dateValue: TextView
    private lateinit var primaryValue: TextView
    private lateinit var secondaryValue: TextView
    private lateinit var combinedValue: TextView
    private lateinit var lifePathValue: TextView
    private lateinit var lifePathSummary: TextView
    private lateinit var lifePathNote: TextView
    private lateinit var noteValue: TextView
    private lateinit var uyValue: TextView
    private lateinit var umValue: TextView
    private lateinit var pyValue: TextView
    private lateinit var pmValue: TextView
    private lateinit var uyNote: TextView
    private lateinit var umNote: TextView
    private lateinit var pyNote: TextView
    private lateinit var pmNote: TextView
    private lateinit var birthdayButton: Button
    private lateinit var clearBirthdayButton: Button
    private lateinit var birthdayNote: TextView

    private val longDateFormat =
        DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy", Locale.US)
    private val birthdayFormat =
        DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.US)
    private val monthDayFormat =
        DateTimeFormatter.ofPattern("MMMM d", Locale.US)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        dateValue = findViewById(R.id.date_value)
        primaryValue = findViewById(R.id.primary_value)
        secondaryValue = findViewById(R.id.secondary_value)
        combinedValue = findViewById(R.id.combined_value)
        lifePathValue = findViewById(R.id.life_path_value)
        lifePathSummary = findViewById(R.id.life_path_summary)
        lifePathNote = findViewById(R.id.life_path_note)
        noteValue = findViewById(R.id.note_value)
        uyValue = findViewById(R.id.uy_value)
        umValue = findViewById(R.id.um_value)
        pyValue = findViewById(R.id.py_value)
        pmValue = findViewById(R.id.pm_value)
        uyNote = findViewById(R.id.uy_note)
        umNote = findViewById(R.id.um_note)
        pyNote = findViewById(R.id.py_note)
        pmNote = findViewById(R.id.pm_note)
        birthdayButton = findViewById(R.id.birthday_button)
        clearBirthdayButton = findViewById(R.id.clear_birthday_button)
        birthdayNote = findViewById(R.id.birthday_note)

        findViewById<Button>(R.id.refresh_button).setOnClickListener {
            render()
        }
        birthdayButton.setOnClickListener {
            showBirthdayPicker()
        }
        clearBirthdayButton.setOnClickListener {
            BirthdayStore.clear(this)
            render()
            refreshWidgets()
        }

        render()
    }

    override fun onResume() {
        super.onResume()
        render()
    }

    private fun showBirthdayPicker() {
        val current = BirthdayStore.getDate(this) ?: LocalDate.of(2000, 1, 1)
        DatePickerDialog(
            this,
            { _, year, month, day ->
                BirthdayStore.set(this, LocalDate.of(year, month + 1, day))
                render()
                refreshWidgets()
            },
            current.year,
            current.monthValue - 1,
            current.dayOfMonth
        ).show()
    }

    private fun render() {
        val today = LocalDate.now()
        val energies = Numerology.calculate(today)
        val birthdayDate = BirthdayStore.getDate(this)
        val birthday = birthdayDate?.let { Birthday(it.monthValue, it.dayOfMonth) }
        val cycles = Cycles.calculateCycleEnergies(today, birthday)

        dateValue.text = today.format(longDateFormat)
        primaryValue.text = energies.fullDateEnergy.displayValue
        secondaryValue.text = energies.secondaryEnergy.displayValue
        combinedValue.text = energies.combinedKey

        val lifePath = birthdayDate?.let { LifePath.calculate(it) }
        if (lifePath != null) {
            lifePathValue.text = lifePath.displayValue
            lifePathSummary.text = lifePath.summary
            lifePathNote.text = when {
                lifePath.isWealth -> getString(R.string.life_path_wealth_note)
                lifePath.reducedNumber == 33 -> getString(R.string.life_path_33_note)
                lifePath.total == lifePath.reducedNumber ->
                    getString(R.string.life_path_master_note, lifePath.total)
                else -> getString(
                    R.string.life_path_note_format,
                    lifePath.monthValue,
                    lifePath.dayValue,
                    lifePath.yearValue,
                    lifePath.total,
                    lifePath.displayValue
                )
            }
            lifePathValue.contentDescription =
                "${getString(R.string.label_life_path)} ${lifePath.displayValue}, ${lifePath.summary}"
        } else {
            lifePathValue.text = "—"
            lifePathSummary.text = getString(R.string.life_path_set_birthday)
            lifePathNote.text = getString(R.string.life_path_needs_full_date)
            lifePathValue.contentDescription = getString(R.string.label_life_path)
        }

        val primaryNote = energies.fullDateEnergy.summary.replace("\n", " · ")
        val secondaryNote = energies.secondaryEnergy.note
        noteValue.text = if (secondaryNote != null) {
            "$primaryNote\n$secondaryNote"
        } else {
            primaryNote
        }

        uyValue.text = cycles.universalYear.displayValue
        umValue.text = cycles.universalMonth.displayValue
        uyNote.text = cycles.universalYear.dateLabel
        umNote.text = cycles.universalMonth.dateLabel

        uyValue.contentDescription =
            "${getString(R.string.label_universal_year)} ${cycles.universalYear.displayValue}"
        umValue.contentDescription =
            "${getString(R.string.label_universal_month)} ${cycles.universalMonth.displayValue}"

        if (birthday != null && cycles.personalYear != null && cycles.personalMonth != null) {
            pyValue.text = cycles.personalYear.displayValue
            pmValue.text = cycles.personalMonth.displayValue
            pyNote.text = cycles.personalYear.dateLabel
            pmNote.text = cycles.personalMonth.dateLabel
            pyValue.contentDescription =
                "${getString(R.string.label_personal_year)} ${cycles.personalYear.displayValue}"
            pmValue.contentDescription =
                "${getString(R.string.label_personal_month)} ${cycles.personalMonth.displayValue}"

            val birthdayLabel = birthdayDate!!.format(birthdayFormat)
            val birthdayMonthDay = birthdayDate.format(monthDayFormat)
            birthdayButton.text = getString(R.string.birthday_format, birthdayLabel)
            birthdayNote.text = getString(R.string.birthday_changes, birthdayMonthDay)
            clearBirthdayButton.isEnabled = true
            clearBirthdayButton.alpha = 1f
        } else {
            pyValue.text = "—"
            pmValue.text = "—"
            pyNote.text = ""
            pmNote.text = ""
            pyValue.contentDescription = getString(R.string.label_personal_year)
            pmValue.contentDescription = getString(R.string.label_personal_month)
            birthdayButton.text = getString(R.string.set_birthday)
            birthdayNote.text = getString(R.string.birthday_not_set)
            clearBirthdayButton.isEnabled = false
            clearBirthdayButton.alpha = 0.4f
        }
    }

    private fun refreshWidgets() {
        DailyEnergyWidgetProvider.updateAllWidgets(this)
        DailyEnergyCalendarWidgetProvider.updateAllWidgets(this)
    }
}
