/* ==========================================================================
   DOM CONTENT LOADED
   ========================================================================== */

/* 
  Wait for the HTML to fully load before running JavaScript.
  
  WHY: If JavaScript runs before HTML exists, it will try to select
  elements that don't exist yet → errors!
  
  This ensures all HTML elements are available for selection.
*/
document.addEventListener('DOMContentLoaded', () => {
  

  /* ==========================================================================
     ELEMENT SELECTION
     ========================================================================== */

  /* 
    Cache references to DOM elements we'll use repeatedly.
    
    WHY: Querying the DOM (document.querySelector) is "expensive" 
    (takes processing time). Storing references in variables is faster.
    
    Naming convention: 
    - Inputs end with "Input"
    - Buttons end with "Button" 
    - Errors end with "Error"
    - Outputs end with "Output"
  */

  // Main form element
  const form = document.querySelector('.calculator__form');

  // Input fields (where users enter data)
  const billInput = document.getElementById('bill');
  const customTipInput = document.getElementById('tip-custom');
  const peopleInput = document.getElementById('people');

  // Tip percentage buttons (5%, 10%, 15%, 25%, 50%)
  // Array.from() converts NodeList to array (gives us more array methods)
  const tipButtons = Array.from(document.querySelectorAll('.calculator__tip-button'));

  // Error message element for "Can't be zero" validation
  const peopleError = document.getElementById('people-error');

  // The entire field wrapper (to add/remove error styling)
  const peopleField = peopleInput.closest('.calculator__field');

  // Output displays (where we show calculated results)
  const tipAmountOutput = document.getElementById('tip-amount');
  const totalPerPersonOutput = document.getElementById('total-per-person');

  // Reset button (clears all inputs)
  const resetButton = document.querySelector('.calculator__reset');


  /* ==========================================================================
     HELPER FUNCTIONS
     ========================================================================== */

  /* 
    These are small, reusable functions that do one specific job.
    Breaking code into small functions makes it easier to:
    - Understand (each function has one purpose)
    - Test (can test each function independently)
    - Reuse (call the same function multiple times)
    - Debug (easier to find where bugs are)
  */

  /**
   * Format a number as currency ($X.XX)
   * @param {number} value - The value to format
   * @returns {string} Formatted string like "$12.50"
   */
  function formatCurrency(value) {
    /* 
      Number.isFinite() checks if value is a valid number.
      Prevents bugs from NaN, Infinity, or non-numeric values.
      
      WHY: If calculation fails, we might get NaN. 
      This ensures we always have a valid number to display.
    */
    const safeValue = Number.isFinite(value) ? value : 0;
    
    /* 
      toFixed(2) formats number with exactly 2 decimal places.
      Example: 5 → "5.00", 12.5 → "12.50"
    */
    return `$${safeValue.toFixed(2)}`;
  }

  /**
   * Update the result displays with calculated values
   * @param {number} tipPerPerson - Tip amount per person
   * @param {number} totalPerPerson - Total amount per person
   */
  function updateOutputs(tipPerPerson = 0, totalPerPerson = 0) {
    /* 
      textContent updates what's displayed on screen.
      This is safer than innerHTML (prevents XSS attacks).
      
      The outputs will automatically announce changes to screen readers
      because they have aria-live="polite" in the HTML.
    */
    tipAmountOutput.textContent = formatCurrency(tipPerPerson);
    totalPerPersonOutput.textContent = formatCurrency(totalPerPerson);
  }

  /**
   * Remove active state from all tip buttons
   * 
   * WHY: Only one tip button should be selected at a time.
   * When user clicks a new button, we first clear all others.
   */
  function clearActiveTipButtons() {
    tipButtons.forEach((button) => {
      /* Remove visual active state */
      button.classList.remove('is-active');
      
      /* Update accessibility state for screen readers */
      button.setAttribute('aria-pressed', 'false');
    });
  }

  /**
   * Mark a specific tip button as selected
   * @param {HTMLElement} selectedButton - The button that was clicked
   */
  function setActiveTipButton(selectedButton) {
    /* First, clear all other buttons */
    clearActiveTipButtons();
    
    /* Then, activate the selected button */
    selectedButton.classList.add('is-active');
    selectedButton.setAttribute('aria-pressed', 'true');
  }

  /**
   * Display the "Can't be zero" error for people input
   * 
   * This does THREE things for accessibility:
   * 1. Makes error message visible (hidden = false)
   * 2. Adds red border to field (is-error class)
   * 3. Tells screen readers there's an error (aria-invalid)
   */
  function showPeopleError() {
    peopleError.hidden = false;
    peopleField.classList.add('is-error');
    peopleInput.setAttribute('aria-invalid', 'true');
  }

  /**
   * Hide the "Can't be zero" error
   * 
   * Reverses everything from showPeopleError()
   */
  function clearPeopleError() {
    peopleError.hidden = true;
    peopleField.classList.remove('is-error');
    peopleInput.setAttribute('aria-invalid', 'false');
  }

  /**
   * Enable/disable the Reset button based on form state
   * 
   * WHY: Reset should only be clickable when there's something to reset.
   * This prevents confusion (why reset an empty form?).
   */
  function updateResetButtonState() {
    /* Check if any field has a value */
    const hasBillValue = billInput.value.trim() !== '';
    const hasCustomTipValue = customTipInput.value.trim() !== '';
    const hasPeopleValue = peopleInput.value.trim() !== '';
    
    /* Check if any tip button is selected */
    const hasSelectedTip = tipButtons.some((button) =>
      button.classList.contains('is-active')
    );

    /* 
      Disable reset if ALL fields are empty.
      The ! operator inverts the result:
      - If any field has value → reset enabled
      - If all fields empty → reset disabled
    */
    resetButton.disabled = !(hasBillValue || hasCustomTipValue || hasPeopleValue || hasSelectedTip);
  }

  /**
   * Get the currently selected tip percentage
   * @returns {number} Tip percentage (e.g., 10 for 10%)
   * 
   * Priority:
   * 1. Custom tip input (if user typed a value)
   * 2. Active button (if user clicked a preset)
   * 3. 0 (if nothing selected)
   */
  function getSelectedTipPercent() {
    /* First, check if custom tip input has a value */
    const customTipValue = customTipInput.value.trim();

    if (customTipValue !== '') {
      /* User entered a custom tip */
      const customTip = parseFloat(customTipValue);
      return Number.isFinite(customTip) ? customTip : 0;
    }

    /* No custom tip, check if a button is selected */
    const activeButton = tipButtons.find((button) =>
      button.classList.contains('is-active')
    );

    if (!activeButton) {
      /* No button selected either */
      return 0;
    }

    /* Get the tip value from the button's data-tip attribute */
    const presetTip = parseFloat(activeButton.dataset.tip);
    return Number.isFinite(presetTip) ? presetTip : 0;
  }


  /* ==========================================================================
     MAIN CALCULATION FUNCTION
     ========================================================================== */

  /**
   * Main calculation logic - runs whenever user changes any input
   * 
   * Flow:
   * 1. Get values from inputs
   * 2. Validate the values
   * 3. Check for errors (people = 0)
   * 4. Calculate tip and total
   * 5. Update the display
   * 6. Update reset button state
   */
  function calculate() {
    /* Step 1: Get raw values from inputs */
    const billValue = billInput.value.trim();
    const peopleValue = peopleInput.value.trim();

    /* Step 2: Convert strings to numbers */
    const bill = parseFloat(billValue);
    const people = parseFloat(peopleValue);
    const tipPercent = getSelectedTipPercent();

    /* Step 3: Check for the "people = 0" error case */
    const peopleIsZero = peopleValue !== '' && Number(peopleValue) === 0;

    if (peopleIsZero) {
      showPeopleError();
    } else {
      clearPeopleError();
    }

    /* Step 4: Initialize result variables */
    let tipPerPerson = 0;
    let totalPerPerson = 0;

    /* Step 5: Validate all inputs before calculating */
    const billIsValid = Number.isFinite(bill) && bill >= 0;
    const peopleIsValid = Number.isFinite(people) && people > 0;
    const tipIsValid = Number.isFinite(tipPercent) && tipPercent >= 0;

    /* Step 6: Calculate if everything is valid */
    if (billIsValid && peopleIsValid && tipIsValid) {
      /* 
        Tip calculation:
        tipPerPerson = (bill × tip%) ÷ people
        
        Example: $100 bill, 15% tip, 4 people
        tipPerPerson = (100 × 15) ÷ 4 = $3.75
      */
      tipPerPerson = (bill * tipPercent / 100) / people;
      
      /* 
        Total calculation:
        totalPerPerson = (bill ÷ people) + tipPerPerson
        
        Example: $100 bill, 4 people, $3.75 tip
        totalPerPerson = (100 ÷ 4) + 3.75 = $28.75
      */
      totalPerPerson = (bill / people) + tipPerPerson;
    }

    /* Step 7: Update the display with results */
    updateOutputs(tipPerPerson, totalPerPerson);
    
    /* Step 8: Enable/disable reset button */
    updateResetButtonState();
  }


  /* ==========================================================================
     EVENT LISTENERS
     ========================================================================== */

  /* 
    Event listeners make the form interactive.
    They "listen" for user actions and respond by running functions.
    
    We use the 'input' event because it fires:
    - When user types
    - When user deletes
    - When user pastes text
    - When value changes via any method
    
    This gives instant, real-time calculation!
  */

  /* Recalculate when bill amount changes */
  billInput.addEventListener('input', calculate);

  /* Recalculate when number of people changes */
  peopleInput.addEventListener('input', calculate);

  /* 
    Recalculate when custom tip input changes.
    Also clear any selected tip button (custom takes priority).
  */
  customTipInput.addEventListener('input', () => {
    clearActiveTipButtons();
    calculate();
  });

  /* 
    Handle clicks on preset tip buttons (5%, 10%, etc.)
    
    When user clicks a button:
    1. Mark it as active (and clear others)
    2. Clear custom tip input (button takes priority)
    3. Recalculate with new tip percentage
  */
  tipButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveTipButton(button);
      customTipInput.value = '';  /* Clear custom input */
      calculate();
    });
  });

  /* 
    Prevent form submission (page reload).
    
    WHY: Forms normally submit to a server and reload the page.
    We're using JavaScript only, so we prevent the default behavior.
  */
  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  /* 
    Handle form reset (when user clicks "Reset" button)
    
    WHY requestAnimationFrame?
    - The reset happens FIRST (browser clears all inputs)
    - Then our code runs (clears buttons, errors, outputs)
    - This ensures we don't clear values before the browser resets them
    
    requestAnimationFrame schedules our code to run after the reset.
  */
  form.addEventListener('reset', () => {
    window.requestAnimationFrame(() => {
      clearActiveTipButtons();      /* Deselect all tip buttons */
      clearPeopleError();           /* Hide any error messages */
      updateOutputs(0, 0);          /* Reset displays to $0.00 */
      resetButton.disabled = true;  /* Disable reset (nothing to reset) */
    });
  });


  /* ==========================================================================
     INITIALIZATION
     ========================================================================== */

  /* 
    Set initial state when page loads.
    
    WHY: We want the form to start in a known state:
    - Reset button disabled (no data to reset yet)
    - Outputs showing $0.00
    - No error messages visible
    
    This runs once when the page first loads.
  */
  resetButton.disabled = true;
  updateOutputs(0, 0);
  clearPeopleError();
});
