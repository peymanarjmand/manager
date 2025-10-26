import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Contact } from './types';
import { supabaseStateStorage } from '../../lib/supabaseStorage';

const STORAGE_KEY = 'lifeManagerPhoneBook';

interface PhoneBookState {
    contacts: Contact[];
    saveContact: (contact: Contact) => void;
    deleteContact: (id: string) => void;
    importContacts: (newContacts: Contact[]) => void;
}

export const usePhoneBookStore = create<PhoneBookState>()(
    persist(
        (set) => ({
            contacts: [],
            saveContact: (contact) =>
                set((state) => {
                    const contacts = [...state.contacts];
                    const index = contacts.findIndex((c) => c.id === contact.id);

                    if (index > -1) { // Edit
                        contacts[index] = contact;
                    } else { // Add
                        contacts.push(contact);
                    }
                    return { contacts };
                }),
            deleteContact: (id) =>
                set((state) => ({
                    contacts: state.contacts.filter((c) => c.id !== id),
                })),
            importContacts: (newContacts) =>
                set((state) => {
                    const existingFns = new Set(state.contacts.map(c => c.fn));
                    const uniqueNewContacts = newContacts.filter(nc => !existingFns.has(nc.fn));
                    return { contacts: [...state.contacts, ...uniqueNewContacts] };
                }),
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => supabaseStateStorage as unknown as Storage),
        }
    )
);
