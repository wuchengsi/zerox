import {useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {fetchCategories, selectActiveCategories} from '../../redux/slice/categoryDataSlice';
import {fetchExpensesByMonth, invalidateExpenseCache} from '../../redux/slice/expenseDataSlice';
import {selectIsOnboarded} from '../../redux/slice/isOnboardedSlice';
import {selectMonthIndex, selectYear} from '../../redux/slice/monthSelectionSlice';
import {fetchUserData, selectUserId} from '../../redux/slice/userIdSlice';
import {AppDispatch} from '../../redux/store';
import {getMonthNames, getMonthNumber} from '../../utils/dateUtils';
import {getNextAiAutoExpenseTask, requeueInterruptedAiAutoExpenseTasks} from '../../services/aiAutoExpenseTaskService';
import {processAiAutoExpenseQueue} from '../../services/aiAutoExpenseRunner';

const MONTHS = getMonthNames();

const AiAutoExpenseRecovery = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isOnboarded = useSelector(selectIsOnboarded);
  const userId = useSelector(selectUserId);
  const categories = useSelector(selectActiveCategories);
  const selectedYear = useSelector(selectYear);
  const selectedMonthIndex = useSelector(selectMonthIndex);
  const isRecoveringRef = useRef(false);
  const hasRequeuedInterruptedRef = useRef(false);

  useEffect(() => {
    if (!isOnboarded || isRecoveringRef.current) {
      return;
    }

    if (!hasRequeuedInterruptedRef.current) {
      requeueInterruptedAiAutoExpenseTasks();
      hasRequeuedInterruptedRef.current = true;
    }

    const task = getNextAiAutoExpenseTask();
    if (!task) {
      return;
    }

    const runRecoveredTask = async () => {
      isRecoveringRef.current = true;
      try {
        const activeUserId = userId || (await dispatch(fetchUserData()).unwrap()).userId;
        if (!activeUserId) {
          return;
        }

        const loadedCategories = categories.length > 0 ? categories : await dispatch(fetchCategories()).unwrap();
        if (!loadedCategories.some(category => category.categoryStatus)) {
          return;
        }

        const currentYearMonth = `${selectedYear}-${getMonthNumber(MONTHS[selectedMonthIndex])}`;
        await processAiAutoExpenseQueue({
          userId: activeUserId,
          categories: loadedCategories,
          onTaskFinished: async () => {
            dispatch(invalidateExpenseCache());
            await dispatch(fetchExpensesByMonth(currentYearMonth));
          },
        });
      } catch {
        // Keep the queue intact. It will be retried when app state is ready again.
      } finally {
        isRecoveringRef.current = false;
      }
    };

    void runRecoveredTask();
  }, [categories, dispatch, isOnboarded, selectedMonthIndex, selectedYear, userId]);

  return null;
};

export default AiAutoExpenseRecovery;
