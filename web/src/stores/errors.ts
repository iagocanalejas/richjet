import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type CustomError = {
    readable_message: string;
    trace?: object;
};

export const useErrorsStore = defineStore('errors', () => {
    const errors = ref<CustomError[]>([]);
    const hasErrors = computed(() => errors.value.length > 0);

    function addError(error: CustomError) {
        errors.value.push(error);
    }

    function setErrors(newErrors: CustomError[]) {
        errors.value = newErrors;
    }

    function clearErrors() {
        errors.value = [];
    }

    return {
        errors,
        hasErrors,
        addError,
        setErrors,
        clearErrors,
    };
});
