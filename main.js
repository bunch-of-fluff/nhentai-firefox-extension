const loaderTemplate = `
    <div class="nh-gal-loader">
        <div class="a" style="--n: 5;">
            <div class="dot" style="--i: 0;"></div>
            <div class="dot" style="--i: 1;"></div>
            <div class="dot" style="--i: 2;"></div>
            <div class="dot" style="--i: 3;"></div>
            <div class="dot" style="--i: 4;"></div>
        </div>
    </div>
`;

$.fn.isInViewport = function() {
    const elementTop = $(this).offset().top;
    const elementBottom = elementTop + $(this).outerHeight();
    const viewportTop = $(window).scrollTop();
    const viewportBottom = viewportTop + $(window).height();

    return elementBottom > viewportTop && elementTop < viewportBottom;
};

const addSettingsButton = () => {
    let item = $(`<li><button class="btn btn-square"><i class="fa fa-cogs"></i></button></li>`);
    item.find('button').on('click', () => {
        showSettings();
    })

    $('ul.menu.left').append(item);
}

const bindCovers = () => {
    const covers = $('.cover');
    covers.off().on('mouseenter', (e) => {
        e.stopImmediatePropagation();

        const cover = $(e.target);
        let timeout = cover.data('nhgp-timeout');

        if(timeout === undefined) {
            timeout = null;
        }

        if(timeout !== null) {
            clearTimeout(timeout);
        }

        let waitTime = parseInt(localStorage.getItem('nhgp-timeout'));
        if(isNaN(waitTime) || waitTime < 0) {
            waitTime = 0;
        }

        $('.cover.loaded').each(function () {
            const loadedTippy = $(this).get(0)._tippy;
            if(loadedTippy !== undefined) {
                loadedTippy.hide();
            }
        })

        cover.data('nhgp-timeout', setTimeout(() => {
            if (cover.hasClass('loading') || cover.get(0)._tippy !== undefined) {
                return;
            }
            const loader = $(loaderTemplate);
            cover.addClass('loading').append(loader);

            fetch('https://nhentai.net' + cover.attr('href')).then((r) => {
                r.text().then((html) => {
                    let page = $(html);

                    const preview = $(`<div class="nh-gal-preview"></div>`);

                    const previewImages = page.find('a.gallerythumb > img');
                    let total = previewImages.length;

                    let skip = 0;
                    if (total >= 10) {
                        skip = 5;
                    }

                    let counter = 0;
                    previewImages.each(function () {
                        if (skip > 0) {
                            skip--;
                            return;
                        }

                        if (counter >= 5) {
                            return false;
                        }

                        counter++;
                        preview.append(`<img src="${$(this).attr('data-src')}">`)
                    })

                    loader.remove();
                    cover.removeClass('loading').addClass('loaded');

                    tippy(cover.get(0), {
                        content: preview.get(0).outerHTML,
                        placement: 'auto',
                        allowHTML: true,
                        showOnCreate: true,
                        maxWidth: 500
                    });
                })
            });
        }, waitTime));
    }).on('mouseleave', (e) => {
        const cover = $(e.target);
        let timeout = cover.data('nhgp-timeout');
        if(timeout !== undefined) {
            clearTimeout(timeout);
        }
    });
}

const showSettings = () => {
    $('[id="modal-gal-prev-settings"]').remove();

    const modal = $(`
        <div class="modal micromodal-slide" id="modal-gal-prev-settings" aria-hidden="true">
            <div class="modal__overlay" tabindex="-1" data-micromodal-close>
                <div class="modal__container" role="dialog" aria-modal="true">
                    <header class="modal__header">
                        <h2 class="modal__title">
                            Gallery preview settings
                        </h2>
                    </header>
                    <main class="modal__content">
                        <div class="input-group">
                            <span>Load timeout</span>
                            <small>How long in ms do you want to wait, until preview loading starts ? 1000ms is 1 second</small>
                            <input name="timeout" type="text" value="0">
                        </div>
                        <div class="input-group has-checkbox">
                            <div class="left">
                                <span>Pagination</span>
                                <small>Load next page once the pagination is visible at the bottom.</small>
                            </div>
                            <input name="pagination" type="checkbox" checked="checked">
                        </div>
                    </main>
                    <footer class="modal__footer">
                        <button class="modal__btn" data-micromodal-close aria-label="Close">Close</button>
                    </footer>
                </div>
            </div>
        </div>
    `);

    const timeout = modal.find('input[name="timeout"]');
    let timeoutTime = parseInt(localStorage.getItem('nhgp-timeout'));
    if(isNaN(timeoutTime) || timeoutTime < 0) {
        timeoutTime = 0;
    }
    timeout.val(timeoutTime);

    timeout.on('keyup', (e) => {
        let value = parseInt(e.target.value);
        if(value < 0) {
            value = 0;
        }

        localStorage.setItem('nhgp-timeout', value.toString());
    });

    const pagination = modal.find('input[name="pagination"]');
    pagination.bootstrapToggle();

    if(localStorage.getItem('nhgp-pagination') !== 'true') {
        pagination.bootstrapToggle('off');
    }

    pagination.on('change', (e) => {
        localStorage.setItem('nhgp-pagination', $(e.target).prop('checked').toString())
    })

    $('body').append(modal);

    MicroModal.show('modal-gal-prev-settings');
}

const nextPageLoading = () => {
    $(window).on('scroll', () => {
        const container = $('#content');

        if(
            container.hasClass('loading')
            ||
            localStorage.getItem('nhgp-pagination') !== 'true'
            ||
            $('section.pagination').isInViewport()  === false
        ) {
            return;
        }

        container.addClass('loading');
        container.find('.pagination').html(loaderTemplate);

        const url = new URL(location.href);
        let page = parseInt(url.searchParams.get('page'));
        if(isNaN(page) || page < 1) {
            page = 1;
        }

        page++;
        url.searchParams.set('page', page.toString());

        fetch(url.toString()).then(r => r.text()).then(html => {

            const page = $(html);

            const galleries = page.find('.gallery');
            galleries.find('.cover > img').each(function () {
                $(this).attr('src', $(this).attr('data-src'));
            })

            container.find('.container').append(galleries)
            container.find('.pagination').replaceWith(page.find('.pagination'))

            window.history.pushState({}, document.title, url.toString());

            container.removeClass('loading');
            bindCovers();
        })
    })
}

const scrollTopButton = () => {
    const button = $(`<button class="btn btn-primary btn-scroll-page-top"><i class="fa fa-caret-up"></i></button>`);
    $('body').append(button);

    button.on('click', () => {
        window.scrollTo(0, 0);
    })
}

addSettingsButton();
nextPageLoading();
scrollTopButton();
bindCovers();


