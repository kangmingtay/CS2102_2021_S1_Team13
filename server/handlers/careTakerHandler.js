const pool = require("../db");

/**
 * GET: http://localhost:8888/api/caretakers/expectedSalary/zw?month=2021-10
 * @param {*} req.query.month = 'YYYY-MM' 
 * @Returns {salary: , revenue: }
 */
async function handleGetExpectedSalary(req, res) {
    try {
        const { username } = req.params;
        const month = req.query.month;
        const query = `
            (
                SELECT 3000 AS salary, 0 AS revenue, 0 AS petdays
                FROM full_timer
                WHERE cname = '${username}' 
                AND cname NOT IN (SELECT cname FROM Schedule WHERE to_char(date, 'YYYY-MM') = '${month}') 
            )
            UNION
            (
                SELECT 
                    CASE
                        WHEN '${username}' IN (SELECT cname FROM part_timer) THEN SUM(payment_amt / (end_date - start_date + 1)) * 0.75
                        WHEN '${username}' IN (SELECT cname FROM full_timer) AND COUNT(*) <= 60 THEN 3000
                        WHEN '${username}' IN (SELECT cname FROM full_timer) THEN 3000.0 + 1.0 * (COUNT(*) - 60) / COUNT(*) * SUM(payment_amt / (end_date - start_date + 1)) * 0.8
                    END salary,
                    SUM(payment_amt / (end_date - start_date + 1)) revenue,
                    COUNT(*) AS petdays
                FROM Schedule NATURAL JOIN Bids
                WHERE cname = '${username}' AND date <= end_date AND date >= start_date AND is_selected 
                GROUP BY to_char(date, 'YYYY-MM')
                HAVING to_char(date, 'YYYY-MM') = '${month}'
            );
        `;
        const monthlySalary = await pool.query(query);
        const resp = {
            success: true,
            results: monthlySalary.rows
        };
        return res.status(200).json(resp);
    } catch (err) {
        return res.status(400).send({
            success: false,
            message: err.message,
        })
    }
}


/**
 * GET: http://localhost:8888/api/caretakers/calendar/shannon?date=2021-10
 * @param {*} req.query.month = 'YYYY-MM' 
 * @Returns list of {date:, pname: , pet_name: , category:, care_req:}
 */
async function handleGetCareTakerCalendar(req, res) {
    try {
        const { username } = req.params;
        const month = req.query.month;
        const query = `SELECT to_char(start_date, 'YYYY-MM-DD') AS start, to_char(end_date, 'YYYY-MM-DD') AS end, pet_name || ' (' || pname || '''s ' || category || ')' AS title, care_req AS body, 
        encode_string(pname || pet_name) AS "calendarId", 'allday' AS category
        FROM pets NATURAL JOIN Bids
        WHERE cname = '${username}' AND 
        ((to_char(start_date, 'YYYY-MM') <= '${month}' AND to_char(end_date, 'YYYY-MM') >= '${month}')
        OR
        to_char(end_date + interval '1 month', 'YYYY-MM') = '${month}'
        OR
        to_char(start_date - interval '1 month', 'YYYY-MM') = '${month}'
        ) 
        AND is_selected
        `;
        const CareTakerCalendar = await pool.query(query);
        const resp = {
            success: true,
            results: CareTakerCalendar.rows
        };
        return res.status(200).json(resp);
    } catch (err) {
        return res.status(400).send({
            success: false,
            message: err.message,
        })
    }
}

/**
 * GET: http://localhost:8888/api/caretakers/leaves/shannon?month=2021-10
 * @param {*} req.query.month = 'YYYY-MM'
 * @Returns list of {leave: }
 */
async function handleGetLeaves(req, res) {
    try {
        const { username } = req.params;
        const month = req.query.month;
        const query = `
        (
            SELECT to_char(date, 'YYYY-MM-DD') AS start

            ,0 AS "calendarId", 'allday' AS category, 'ON LEAVE' AS title

            FROM leaves 
            WHERE cname = '${username}' AND (
            to_char(date - interval '1 month' , 'YYYY-MM') = '${month}' OR
            to_char(date, 'YYYY-MM') = '${month}' OR
            to_char(date + interval '1 month', 'YYYY-MM') = '${month}'
            )
        )
        UNION
        (
            SELECT to_char(date, 'YYYY-MM-DD') AS start  
            
            ,0 AS "calendarId", 'allday' AS category, 'UNAVAILABLE' AS title

            FROM generate_series(
                TO_DATE('${month}', 'YYYY-MM') - interval '1 month',
                TO_DATE('${month}', 'YYYY-MM') + interval '2 month',
                '1 day'::interval) AS date
            WHERE '${username}' IN (SELECT cname FROM part_timer)
        )
        EXCEPT
        (
            SELECT to_char(date, 'YYYY-MM-DD') AS start  
            
            ,0 AS "calendarId", 'allday' AS category, 'UNAVAILABLE' AS title
            
            FROM availability
            WHERE cname = '${username}' AND (
            to_char(date - interval '1 month' , 'YYYY-MM') = '${month}' OR
            to_char(date, 'YYYY-MM') = '${month}' OR
            to_char(date + interval '1 month', 'YYYY-MM') = '${month}'
            )
        )
        `;
        const leaves = await pool.query(query);
        const resp = {
            success: true,
            results: leaves.rows
        };
        return res.status(200).json(resp);
    } catch (err) {
        return res.status(400).send({
            success: false,
            message: err.message,
        })
    }
}

/**
 * GET: http://localhost:8888/api/caretakers/availability/zw?year=2021
 * @param {*} req.query.year = 'YYYY' 
 * @Returns list of {available: }
 */
async function handleGetAvailability(req, res) {
    try {
        const { username } = req.params;
        const year = req.query.year;
        const query = `
        SELECT to_char(date, 'DD-MM-YYYY') available FROM availability where to_char(date, 'YYYY') = '${year}' AND cname = '${username}'
        `;
        const availability = await pool.query(query);
        const resp = {
            success: true,
            results: availability.rows
        };
        return res.status(200).json(resp);
    } catch (err) {
        return res.status(400).send({
            success: false,
            message: err.message,
        })
    }
}


/**
 * Either inserts leaves or availability of a caretaker depending on full_timer or part_timer status
 *
 * POST: http://localhost:8888/api/caretakers/requestDays/zw?dates={01-01-2023, 06-06-2023, 12-31-2023}
 * @param {*} req.query.dates = '{DD-MM-YYYY, DD-MM-YYY, DD-MM-YYYY....}' 
 */
async function handlerAddNotWorking(req, res) {
    //disabling selection of dates before current year should be done in frontend.
    try {
        const { username } = req.params;
        const dates = req.body.dates;
        // const { dates } = req.body;
        const query1 = `
        SELECT specify_leaves('${username}'::VARCHAR(256), '${dates}'::date[])
        FROM full_timer
        WHERE cname = '${username}';
        `
        const query2 = `
        DELETE FROM availability
            WHERE cname = '${username}' 
            AND date = ANY('${dates}'::date[])
            AND date NOT IN (SELECT date FROM schedule WHERE cname = '${username}')
            AND '${username}' IN (SELECT cname FROM part_timer)
            AND date > CURRENT_DATE;
        `;
        const updateResult1 = await pool.query(query1);
        const updateResult2 = await pool.query(query2);
        const resp = {
            success: true,
            message: `${updateResult1.rowCount + updateResult2.rowCount}`,
        };
        return res.status(200).json(resp);

    } catch (err) {
        return res.status(400).send({
            success: false,
            message: err.message,
        })
    }
}

/**
 * Either deletes leaves or availability of a caretaker depending on full_timer or part_timer status
 *
 * DELETE: http://localhost:8888/api/caretakers/requestDays/zw?dates={01-01-2023, 06-06-2023, 12-31-2023}
 * @param {*} req.query.dates = '{DD-MM-YYYY, DD-MM-YYY, DD-MM-YYYY....}' 
 */
async function handlerDeleteNotWorking(req, res) {
    //disabling selection of dates before current year should be done in frontend.
    try {
        const { username } = req.params;
        const dates = req.query.dates;

        const query1 = `
        DELETE FROM leaves
            WHERE cname = '${username}' 
            AND date = ANY('${dates}'::date[])
            AND '${username}' IN (SELECT cname FROM full_timer)
            AND date > CURRENT_DATE;
        `
        const query2 = `
        SELECT specify_availability('${username}'::VARCHAR(256), '${dates}'::date[])
        FROM part_timer
        WHERE cname = '${username}';
        `;
        const updateResult1 = await pool.query(query1);
        const updateResult2 = await pool.query(query2);
        const resp = {
            success: true,
            message: `${updateResult1.rowCount + updateResult2.rowCount}`,
        };
        return res.status(200).json(resp);
    } catch (err) {
        return res.status(400).send({
            success: false,
            message: err.message,
        })
    }
}


/**
 * GET: http://localhost:8888/api/caretakers/prefers/zw
 * @Returns list of {category: }
 */
async function handleGetPreferences(req, res) {
    try {
        const { username } = req.params;
        const query = `SELECT category FROM prefers WHERE cname = '${username}';`;
        const Categories = await pool.query(query);
        const resp = {
            success: true,
            results: Categories.rows
        };
        return res.status(200).json(resp);
    } catch (err) {
        return res.status(400).send({
            success: false,
            message: err.message,
        })
    }
}

async function handleGetAllCategories(req, res) {
    try {
        const { username } = req.params;
        const query = `SELECT category FROM pet_categories;`;
        const Categories = await pool.query(query);
        const resp = {
            success: true,
            results: Categories.rows
        };
        return res.status(200).json(resp);
    } catch (err) {
        return res.status(400).send({
            success: false,
            message: err.message,
        })
    }
}




/**
 * DELETE: http://localhost:8888/api/caretakers/prefers/zw?category=dog
 * @param {*} req.query.category = 'pet_category' 
 */
async function handleDeletePreferences(req, res) {
    try {
        const { username } = req.params;
        const category = req.query.category;
        if (category == null) throw new Error("category is undefined");
        const query = `DELETE FROM prefers WHERE cname = '${username}' AND category = '${category}';`;
        await pool.query(query);
        const resp = {
            success: true,
            message: `'${category}' has successfully been deleted from '${username}'`,
        };
        return res.status(200).json(resp);
    } catch (err) {
        return res.status(400).send({
            success: false,
            message: err.message,
        })
    }
}

/**
 * PUT: http://localhost:8888/api/caretakers/prefers/zw?category_from=dog&category_to=cat
 * @param {*} req.query.category_from = 'pet_category' 
 * @param {*} req.query.category_to = 'pet_category' 
 */
async function handleUpdatePreferences(req, res) {
    try {
        const { username } = req.params;
        const category_from = req.query.category_from;
        const category_to = req.query.category_to;
        // const { category_from, category_to} = req.body;
        if (category_from == null || category_to == null) throw new Error("'category_from' and 'category_to' are undefined");
        const query = `UPDATE prefers SET category = '${category_to}' WHERE cname = '${username}' AND category = '${category_from}';`;
        await pool.query(query);
        const resp = {
            success: true,
            message: `'${category_from}' has successfully been updated to '${category_to}'`,
        };
        return res.status(200).json(resp);
    } catch (err) {
        return res.status(400).send({
            success: false,
            message: err.message,
        })
    }
}

/**
 * POST: http://localhost:8888/api/caretakers/prefers/zw?categories
 * @param {*} req.query.categories = 'pet_category' 
 */
async function handleCreatePreferences(req, res) {
    try {
        const { username } = req.params;
        const categories = req.body.categories;
        const query = `
        DELETE FROM prefers WHERE cname = '${username}';
        INSERT INTO prefers SELECT '${username}', category FROM unnest('${categories}'::VARCHAR(256)[]) AS category;
        `;
        const updateResult = await pool.query(query);

        const resp = {
            success: true,
            message: `Added '${categories}' successfully, ${updateResult.rowCount} rows updated`,
        };
        return res.status(200).json(resp);
    } catch (err) {
        return res.status(400).send({
            success: false,
            message: err.message,
        })
    }
}

/**
 * GET: http://localhost:8888/api/caretakers/rating/zw
 * @Returns {rating: }
 */
async function handleGetCareTakerRating(req, res) {
    try {
        const { username } = req.params;
        const query = `
        SELECT rating FROM care_takers where cname = '${username}';
        `;
        const rating = await pool.query(query);
        const resp = {
            success: true,
            results: rating.rows
        };
        return res.status(200).json(resp);
    } catch (err) {
        return res.status(400).send({
            success: false,
            message: err.message,
        })
    }
}

/**
 * POST: http://localhost:8888/api/caretakers/selectbid/shannon?pname=km&pet_name=km_dog&start_date=03-12-2021&end_date=30-12-2021
 * 
 * @param req.query.pname = pet owner name
 * @param req.query.pet_name = pet name
 * @param req.query.start_date = start date 'YYYY-MM-DD'
 * @param req.query.end_date = end date 'YYYY-MM-DD'
 */
async function handleSelectBid(req, res) {
    try {
        const { username } = req.params;
        const { pname, pet_name, start_date, end_date } = req.query;
        const query = `
        UPDATE bids SET is_selected=true WHERE pname='${pname}'
            AND pet_name = '${pet_name}' AND start_date = TO_DATE('${start_date}', 'YYYY-MM-DD') AND end_date = TO_DATE('${end_date}', 'YYYY-MM-DD')
            AND cname = '${username}'
            
            -- check if caretaker is overbooked on those days
            AND (
                ('${username}' IN (SELECT cname FROM full_timer) AND 5 > ALL(
                    SELECT pet_count FROM Schedule WHERE cname = '${username}' AND date <= end_date AND date >= start_date
                    )
                )
                OR
                ('${username}' IN (SELECT cname FROM part_timer) AND (SELECT rating FROM care_takers WHERE cname = '${username}') <= 2 AND 2 > ALL(
                    SELECT pet_count FROM Schedule WHERE cname = '${username}' AND date <= end_date AND date >= start_date
                    )
                )
                OR
                ('${username}' IN (SELECT cname FROM part_timer) AND CEILING((SELECT rating FROM care_takers WHERE cname = '${username}')) > ALL(
                    SELECT pet_count FROM Schedule WHERE cname = '${username}' AND date <= end_date AND date >= start_date
                    )
                )
            )
            
            -- check if caretaker is free on those days
            AND (
                ('${username}' IN (SELECT cname FROM full_timer) AND 0 = (
                    SELECT COUNT(*) FROM leaves WHERE date <= end_date AND date >= start_date AND '${username}'= cname
                    )
                )
                OR
                ('${username}' IN (SELECT cname FROM part_timer) AND (end_date - start_date + 1) = (
                    SELECT COUNT(*) FROM availability WHERE date <= end_date AND date >= start_date AND '${username}'= cname
                    )
                )
            )

        `;
        const updateResult = await pool.query(query);
        let resp = {}
        if (updateResult.rowCount === 1) {
            resp = {
                success: true,
                message: `Selected bid successfully`,
            };
        } else {
            resp = {
                success: false,
                message: `Update failed`,
            }
        }
        return res.status(200).json(resp);

    } catch (err) {
        return res.status(400).send({
            success: false,
            message: err.message,
        })
    }
}


module.exports = {
    handleGetExpectedSalary,
    handleGetCareTakerCalendar,
    handlerDeleteNotWorking,
    handleUpdatePreferences,
    handleCreatePreferences,
    handleDeletePreferences,
    handleGetPreferences,
    handleGetAllCategories,
    handleGetLeaves,
    handleGetAvailability,
    handlerAddNotWorking,
    handleGetCareTakerRating,
    handleSelectBid
}