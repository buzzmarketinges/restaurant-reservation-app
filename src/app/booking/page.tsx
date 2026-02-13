import BookingContainer from '@/components/booking/BookingContainer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Reservar Mesa | Restaurante AI',
};

export default function BookingPage() {
    return <BookingContainer />;
}
