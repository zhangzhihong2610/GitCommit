import { createI18n } from 'vue-i18n';

import zh_cn from './lang/zh-cn';
import en from './lang/en';
import ja from './lang/ja';

const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: {
        zh_cn,
        en,
        ja
    }
});

export default i18n;
