import {useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {fetchCategories, selectActiveCategories} from '../../redux/slice/categoryDataSlice';
import {fetchExpensesByMonth, invalidateExpenseCache} from '../../redux/slice/expenseDataSlice';
import {selectIsOnboarded} from '../../redux/slice/isOnboardedSlice';
import {selectMonthIndex, selectYear} from '../../redux/slice/monthSelectionSlice';
import {selectUserId} from '../../redux/slice/userIdSlice';
import {AppDispatch} from '../../redux/store';
import {getMonthNames, getMonthNumber} from '../../utils/dateUtils';
import {getNextAiAutoExpenseTask} from '../../services/aiAutoExpenseTaskService';
import {processAiAutoExpenseQueue} from '../../services/aiAutoExpenseRunner';

const MONTHS = getMonthNames();

const AiAutoExpenseRecovery = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isOnboarded = useSelector(selectIsOnboarded);
  const userId = useSelector(selectUserId);
  const categories = useSelector(selectActiveCategories);
  const selectedYear = useSelector(selectYear);
  const selectedMonthIndex = useSelector(selectMonthIndex);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!isOnboarded || hasCheckedRef.current) {
      return;
    }

    hasCheckedRef.current = true;
    const task = getNextAiAutoExpenseTask();
    if (!task) {
      return;
    }

    const runRecoveredTask = async () => {
      const loadedCategories = categories.length > 0 ? categories : await dispatch(fetchCategories()).unwrap();
      const currentYearMonth = `${selectedYear}-${getMonthNumber(MONTHS[selectedMonthIndex])}`;
      await processAiAutoExpenseQueue({
        userId,
        categories: loadedCategories,
        onTaskFinished: async () => {
          dispatch(invalidateExpenseCache());
          await dispatch(fetchExpensesByMonth(currentYearMonth));
        },
      });
    };

    void runRecoveredTask();
  }, [categories, dispatch, isOnboarded, selectedMonthIndex, selectedYear, userId]);

  return null;
};

export default AiAutoExpenseRecovery;
