var express = require('express');
var router = express.Router();
var request = require('request');
var util = require('util');
var async = require('async');
var objectHeaders = require('../helpers/headers');
var localSession = require('../middlewares/localSession');

router.get('/', localSession, function (req, res, next) {
    req.checkQuery('field', 'Invalid field').notEmpty().isAlpha();

    req.getValidationResult().then(function (result) {
        if (!result.isEmpty()) {
            res.status(400).send('There have been validation errors: ' + util.inspect(result.array()));
            return;
        } else {
            var page = req.query.page ? req.query.page : 1;
            var field = req.query.field;
            async.parallel({
                section: function (callback) {
                    request({
                        url: req.configs.api_base_url + 'books/?field=' + field + '&page=' + page,
                        headers: objectHeaders.headers
                    }, function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            try {
                                var section = JSON.parse(body);
                                callback(null, section);
                            } catch (errorJSONParse) {
                                callback(null, null);
                            }
                        } else {
                            callback(null, null);
                        }
                    });
                },
                categories: function (callback) {
                    request({
                        url: req.configs.api_base_url + 'categories',
                        headers: objectHeaders.headers
                    }, function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            try {
                                var categories = JSON.parse(body);
                                callback(null, categories);
                            } catch (errorJSONParse) {
                                callback(null, null);
                            }
                        } else {
                            callback(null, null);
                        }
                    });
                }
            }, function (err, results) {
                if (err) {
                    res.status(400).send(err);
                } else {
                    res.render('books/section', {
                        field: field,
                        section: results.section,
                        categories: results.categories,
                        error: req.flash('error'),
                        info: req.flash('info'),
                    });
                }
            });
        }
    });
});

router.get('/:id', localSession, function (req, res, next) {
    req.checkParams('id', 'Invalid id').notEmpty().isInt();
    req.getValidationResult().then(function (result) {
        if (!result.isEmpty()) {
            res.status(400).send('There have been validation errors: ' + util.inspect(result.array()));
            return;
        } else {
            request({
                url: req.configs.api_base_url + 'books/' + req.params.id,
                headers: objectHeaders.headers
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    try {
                        var data = JSON.parse(body);
                        var currentUserReview = null;
                        var btnBooking = {
                            'text': 'Add to Reading',
                            'data_status': req.configs.book_user.status.reading
                        };

                        if (typeof req.session.user !== 'undefined') {
                            var userReading = data.item.user_reading_book;
                            var userWaitings = data.item.users_waiting_book;
                            var bookStatus = data.item.status;

                            if (data.item.reviews_detail_book.length > 0) {
                                data.item.reviews_detail_book.forEach (function (review) {
                                    if (review.user.id === req.session.user.id) {
                                        currentUserReview = review;
                                        return;
                                    }
                                });
                            }

                            if (bookStatus === req.configs.book.status.unavailable) {
                                if (userReading !== null) {
                                    if (req.session.user.id === userReading.id) {
                                        btnBooking = {
                                            'text': 'Return Book',
                                            'data_status': req.configs.book_user.status.done
                                        };
                                    } else if (userWaitings.length === 0) {
                                        btnBooking = {
                                            'text': 'Add to Waiting',
                                            'data_status': req.configs.book_user.status.waiting
                                        };
                                    }
                                }

                                if (userWaitings.length > 0) {
                                    var flag = true;
                                    userWaitings.forEach(function (userWaiting) {
                                        if (userWaiting.id === req.session.user.id) {
                                            flag = false;
                                            btnBooking = {
                                                'text': 'Cancel Waiting',
                                                'data_status': req.configs.book_user.status.cancel_waiting
                                            };
                                            return;
                                        }
                                    });

                                    if (flag && userReading !== null && req.session.user.id !== userReading.id) {
                                        btnBooking = {
                                            'text': 'Add to Waiting',
                                            'data_status': req.configs.book_user.status.waiting
                                        };
                                    }
                                }
                            }
                        }

                        var messages = req.flash('errors');
                        data.item.btn_booking = btnBooking;
                        data.item.current_user_review = currentUserReview;
                        res.render('books/detail', {
                            data: data,
                            pageTitle: 'Chi tiết',
                            messages: messages,
                            error: req.flash('error'),
                            info: req.flash('info')
                        });
                    } catch (errorJSONParse) {
                        req.flash('error', 'Don\'t allow show this book');
                        res.redirect('back');
                    }
                } else {
                    req.flash('error', 'Don\'t allow show this book');
                    res.redirect('back');
                }
            });
        }
    });
});


router.get('/category/:category_id', function (req, res, next) {
    req.checkParams('category_id', 'Invalid category').notEmpty().isInt();

    req.getValidationResult().then(function (result) {
        if (!result.isEmpty()) {
            res.status(400).send('There have been validation errors: ' + util.inspect(result.array()));
            return;
        } else {
            async.parallel({
                books: function (callback) {
                    request({
                        url: req.configs.api_base_url + 'books/category/' + req.params.category_id,
                        headers: objectHeaders.headers
                    }, function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            try {
                                var books = JSON.parse(body);
                                callback(null, books);
                            } catch (errorJSONParse) {
                                callback(null, null);
                            }
                        } else {
                            callback(null, null);
                        }
                    });
                },
                categories: function (callback) {
                    request({
                        url: req.configs.api_base_url + 'categories',
                        headers: objectHeaders.headers
                    }, function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            try {
                                var categories = JSON.parse(body);
                                callback(null, categories);
                            } catch (errorJSONParse) {
                                callback(null, null);
                            }
                        } else {
                            callback(null, null);
                        }
                    });
                }
            }, function (err, results) {
                if (err) {
                    res.redirect('back');
                } else {
                    res.render('books/category', {
                        books: results.books,
                        categories: results.categories,
                        categoryId: req.params.category_id
                    });
                }
            });
        }
    });
});

router.post('/review/:id', function (req, res, next) {
    req.checkBody('content').notEmpty().len(1, 255);

    req.getValidationResult().then(function (result) {
        if (!result.isEmpty()) {
            req.flash('errors', result.array());
            res.redirect('/books/' + req.params.id + '#form-review');
        } else {
            var star = req.body.star != 0 ? req.body.star : 1;
            request.post({
                url: req.configs.api_base_url + 'books/review/' + req.params.id,
                form: {'item': {'content': req.body.content, 'star': star}},
                headers: objectHeaders.headers({'Authorization': req.session.access_token})
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    try {
                        req.flash('info', 'Thank for your review');
                        res.redirect('back');
                    } catch (errorJSONParse) {
                        res.redirect('back');
                    }
                } else {
                    if (response.statusCode == 401) {
                        req.flash('error', 'Please login to review this book');
                        res.redirect('back');
                    } else {
                        req.flash('error', 'Don\'t allow review this book');
                        res.redirect('back');
                    }
                }
            });
        }
    });
});

module.exports = router;
