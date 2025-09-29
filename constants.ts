export const SERVICES: string[] = ['Corte de Cabelo', 'Coloração', 'Manicure', 'Pedicure', 'Tratamento Facial', 'Massagem', 'Manutenção', 'Banho de Gel', 'Fibra de Vidro'];

export const MONTHS: string[] = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const DAYS: string[] = Array.from({ length: 31 }, (_, i) => String(i + 1));

export const YEARS: string[] = [String(new Date().getFullYear()), String(new Date().getFullYear() + 1)];

// Horários das 07:00 às 20:00
export const TIMES: string[] = Array.from({ length: 14 }, (_, i) => {
    const hour = i + 7;
    return `${String(hour).padStart(2, '0')}:00`;
});
